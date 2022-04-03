'use strict';
import 'core.js';
import 'regenerator-runtime/runtime';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//implementing the classes
//PARENT CLASS//
class Workout {
  clicks = 0;
  date = new Date();
  //id usually created using a library, but we will just use a new date
  id = (Date.now() + ``).slice(-10);
  constructor(coords, distance, duration) {
    //theese two we don't need to manually define here because of the new ES6 features!!
    //this.date = date
    //this.id = id
    this.coords = coords; //[lat, lng]
    this.distance = distance; //in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;

    ///////Setting the clicks counter
  }
  click() {
    this.clicks++;
  }
}
//childe classes
class Running extends Workout {
  type = `running`;
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //min / km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = `cycling`;
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //distance / duration
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const run1 = new Running([51, -41], 5.2, 40, 180);
const cycle1 = new Cycling([51, -41], 52.2, 80, 580);
console.log(run1, cycle1);
///////////////////////////////////////APPLICATION ARCHITECTURE//
class App {
  //making these varibles private
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  constructor() {
    //get user position
    this._getPosition();
    //get data from local storage
    this._getLocalStorage();
    //////Submitting the form - attaching event handlers/////
    form.addEventListener(`submit`, this._newWorkout.bind(this));
    inputType.addEventListener(`change`, this._toggleElevationField);
    containerWorkouts.addEventListener(`click`, this._moveToPopup.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Could not get your GPS coordinates!`);
        }
      );
  }

  _loadMap(position) {
    console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.co.uk/maps/@${latitude},${longitude}`);
    //leaflet functions//

    //creting an array with our coordinates///////////////
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //adding the click on the leaflet to map the location
    this.#map.on(`click`, this._showForm.bind(this));

    //render the markers during the load from local storage
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    //rendereing workout input form-----------------------
    form.classList.remove(`hidden`);
    inputDistance.focus();
  }

  //hide form
  _hideForm() {
    //empty inputs and add hidden classback on
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        ``;
    form.style.display = `none`;
    form.classList.add(`hidden`);
    setTimeout(() => ((form.style.display = `grid`), 1000));
  }

  _toggleElevationField() {
    inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
    inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    //get data from form
    const type = inputType.value;
    const distance = +inputDistance.value; // converting it to a number!!!
    const duration = +inputDuration.value; // converting to number!!
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //if workout running, create runnig object
    if (type === `running`) {
      const cadence = +inputCadence.value;
      //check if data is valid
      //using a gurd clause
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert(`Inputs must be positive numbers!`);
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //if workout cycling, create cycling object
    if (type === `cycling`) {
      //check if data is valid
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert(`Inputs must be positive numbers!`);
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //add new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    //render workout on map as a marker
    this._renderWorkoutMarker(workout);

    //render workout on list
    this._renderWorkout(workout);
    //hide forrm & clear input fileds
    this._hideForm();

    ///Storing workouts in a local storage////////////////////////
    this._setlocalStorage();
    //////////////////////////////
  }

  _renderWorkoutMarker(workout) {
    //render workout on map as a marker
    // console.log(this.#mapEvent);
    // display the marker
    // lat and lng can be taken from mapEent in the console

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      `;

    if (workout.type === `running`)
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">km/min</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;

    if (workout.type === `cycling`)
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;

    //injectong HTML element in the code
    form.insertAdjacentHTML(`afterend`, html);
  }
  ////////////////////////////////
  _moveToPopup(e) {
    const workoutEl = e.target.closest(`.workout`);
    console.log(workoutEl);

    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    console.log(workout);
    //setview is a method from LEAFLET, it allows to center on the marker on the map!!!
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duraton: 1,
      },
    });
    //////////IMPLEMENTING THE CLICK IN THE API////////////////////
    //workout.click();
  }
  ///////////////////////////////////set local storage API/////////
  _setlocalStorage() {
    localStorage.setItem(`workouts`, JSON.stringify(this.#workouts));
  }
  //get local storage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem(`workouts`));
    console.log(data);
    if (!data) return;

    //restoring workouts array
    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  //creting a public interface to delete data from local storage/////
  reset() {
    localStorage.removeItem(`workouts`);
    location.reload();
  }
}

//creating obects
const app = new App();

/////////////////////////////////////
//IMPLEMENTING A GEOLOCATION API//////////////////////////////////////////
