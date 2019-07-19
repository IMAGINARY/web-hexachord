// ============================================================================
// i18n Strings

const search = location.search.match(/hl=(\w*)/);
const language = search ? search[1] : 'en';

const strings = {
  en: {
    title: 'The Tonnetz',
    subtitle: 'One key – many representations',
    dual: 'Dual',
    reset: 'Reset',
    load: 'Load Midi File',
    start: 'Start Recording',
    stopRecord: 'Stop Recording',
    play: 'Play',
    stopPlay: 'Stop Playing',
    pause: 'Pause',
    rotate: 'Rotate 180°',
    translate: 'Translate',
    connected: 'This Tonnetz is non-connected and doesn’t contain every note.'
  },
  de: {
    title: 'Das Tonnetz',
    subtitle: 'Ein Klang – viele Darstellungen',
    dual: 'Dual',
    reset: 'Zurücksetzen',
    load: 'Midi Datei Laden',
    start: 'Aufnehmen',
    stopRecord: 'Aufnahme Stoppen',
    play: 'Abspielen',
    stopPlay: 'Abspiel Stoppen',
    pause: 'Pause',
    rotate: '180° Rotieren',
    translate: 'Verschieben',
    connected: 'Dieses Tonnetz ist nicht verbunden, und enthält nicht alle Noten.'
  },
  fr: {
    title: 'Le Tonnetz',
    subtitle: 'Note unique — Représentations nombreuses',
    dual: 'Dual',
    reset: 'Réinitialiser',
    load: 'Charger des données Midi',
    start: 'Enregistrer',
    stopRecord: "Arrêter l'enregistrement",
    play: 'Lecture',
    stopPlay: 'Arrêt',
    pause: 'Pause',
    rotate: 'Rotation à 180°',
    translate: 'Translation',
    connected: "Ce Tonnetz n'est pas connexe et ne contient pas toutes les notes."
  }
}

let languageSelector = {
    props:{
        value:{
            type:String
        },
        languages:{
            type:Array,
            required:true
        }
    },
    template:`
        <div class="languageSwitcher">
            <div v-cloak v-for="lang of languages" 
            @click="$emit('input',lang)">
                {{ lang }}
            </div>
        </div>
    `
}

var Tonnetz_l12n = true