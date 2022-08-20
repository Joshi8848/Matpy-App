'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // prettier-ignore
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // Km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);

///////////////////////////////
// Application Architecture //

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const closeButton = document.querySelector('.edit-button');
const deleteAll = document.querySelector('.fa-trash-can');

let latNew, lngNew;
let lat, lng;
const markerArr = [];

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    containerWorkouts.addEventListener('click', this._editWorkouts.bind(this));

    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));

    deleteAll.addEventListener('click', this._deleteAllWorkouts);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    // const latitude = position.coords.latitude;
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#map.on('click', this._emptyInputFields);

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    console.log(mapE);
    form.classList.remove('hidden');
    inputDistance.focus();
    lat = this.#mapEvent.latlng.lat;
    lng = this.#mapEvent.latlng.lng;
  }

  _hideForm() {
    // Empty inputs
    this._emptyInputFields();

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    console.log('here');
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value; // + infront of strings convert them into number
    const duration = +inputDuration.value;

    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');
      if (!latNew) {
        workout = new Running([lat, lng], distance, duration, cadence);
      } else {
        workout = new Running([latNew, lngNew], distance, duration, cadence);
      }
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');
      if (!latNew) {
        workout = new Cycling([lat, lng], distance, duration, elevation);
      } else {
        workout = new Cycling([latNew, lngNew], distance, duration, elevation);
      }
    }

    // Add new object to workout array
    this.#workouts.push(workout);
    console.log(this.#workouts);
    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
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
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    markerArr.push(marker);
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="edit-icon"><i class="fa-solid fa-pen-to-square"></i></div>
        <div class="close-button"><i class="fa-solid fa-xmark"></i></div>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
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

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">km/min</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
        `;
    }

    if (workout.type === 'cycling') {
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
      </li>
        `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const currWorkout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(currWorkout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _editWorkouts(e) {
    const currentWorkout = e.target.closest('.workout');

    if (!e.target.classList.contains('fa-pen-to-square')) return;
    currentWorkout.remove();
    this.#workouts.forEach(workout => {
      if (workout.id === currentWorkout.dataset.id) {
        form.classList.remove('hidden');
        inputType.value = currentWorkout.classList.contains('workout--running')
          ? 'running'
          : 'cycling';
        this._checkWorkout(workout);
        console.log(workout.coords);
        [latNew, lngNew] = workout.coords;
        console.log('hey');
      }
    });
  }

  _checkWorkout(workout) {
    const cadence = document.querySelector('.form__cadence');
    const elevation = document.querySelector('.form__elevation');
    if (inputType.value === 'running') {
      cadence.classList.remove('form__row--hidden');
      elevation.classList.add('form__row--hidden');
      inputDistance.value = workout.distance;
      inputDuration.value = workout.duration;
      inputCadence.value = workout.cadence;
    } else if (inputType.value === 'cycling') {
      cadence.classList.add('form__row--hidden');
      elevation.classList.remove('form__row--hidden');
      inputDistance.value = workout.distance;
      inputDuration.value = workout.duration;
      inputElevation.value = workout.elevationGain;
    }
  }

  _emptyInputFields() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }

  _deleteWorkout(e) {
    if (!e.target.classList.contains('fa-xmark')) return;
    const currEl = e.target;
    const workouts = currEl.closest('.workout');
    this.#workouts.forEach((workout, index) => {
      if (workout.id === workouts.dataset.id) {
        this._searchMarker(workout);
        this.#workouts.splice(index, 1);
        console.log(this.#workouts);
        workouts.remove();
        this._setLocalStorage();
      }
    });

    // data.forEach((item, ind) => {
    //   if (this.#workouts[ind].id === item.id) {
    //     data.removeIt(ind, 1);
    //     return;
    //   }
    // });
  }

  _searchMarker(workout) {
    markerArr.forEach((marker, index) => {
      const { lat, lng } = marker._latlng;

      if (workout.coords.join(',') === [lat, lng].join(',')) {
        this.#map.removeLayer(marker);
      }
    });
  }

  _deleteAllWorkouts() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

// _checkWorkout(workout) {
//   const cadence = document.querySelector('.form__cadence');
//   const elevation = document.querySelector('.form__elevation');
//   if (inputType.value === 'running') {
//     cadence.classList.remove('form__row--hidden');
//     elevation.classList.add('form__row--hidden');
//     inputDistance.value = workout.distance;
//     inputDuration.value = workout.duration;
//     inputCadence.value = workout.cadence;
//   } else if (inputType.value === 'cycling') {
//     cadence.classList.add('form__row--hidden');
//     elevation.classList.remove('form__row--hidden');
//     inputDistance.value = workout.distance;
//     inputDuration.value = workout.duration;
//     inputElevation.value = workout.elevationGain;
//   }
// }

// _deleteWorkout(e) {
//   e.preventDefault();
//   if (!e.target.classList.contains('fa-xmark')) return;
//   const currEl = e.target;
//   const workouts = currEl.closest('.workout');
//   this.#workouts.forEach((workout, index) => {
//     if (workout.id === workouts.dataset.id) {
//       this._searchMarker(workout);
//       this.#workouts.splice(index, 1);
//       console.log(this.#workouts);
//       workouts.remove();
//     }
//   });

//   // data.forEach((item, ind) => {
//   //   if (this.#workouts[ind].id === item.id) {
//   //     data.removeIt(ind, 1);
//   //     return;
//   //   }
//   // });
// }

// _searchMarker(workout) {
//   markerArr.forEach((marker, index) => {
//     const { lat, lng } = marker._latlng;

//     if (workout.coords.join(',') === [lat, lng].join(',')) {
//       this.#map.removeLayer(marker);
//     }
//   });
// }

// _emptyInputFields() {
//   // Empty inputs
//   inputDistance.value =
//     inputDuration.value =
//     inputCadence.value =
//     inputElevation.value =
//       '';
// }
