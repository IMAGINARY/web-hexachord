// Component to handle loading a MIDI file (including a modal window)
let songLoader = {
    props:{
        fileBrowser: Boolean, // Enable loading files from disk
        freeURL: Boolean // Enable loading files from a distant URL
    },
    data: function(){return {
        // List of preset songs
        //TODO: More formatted presentation
        //STRETCH: Turn into a basic song library 
        files: [
            {
                humanName:"Elton John — Your Song",
                fileName:"Midi/001_Elton_John-1.MID"
            },
            {
                humanName:"Keith Jarrett — Extract of the Köln Concert",
                fileName:"Midi/002_Keith_Jarrett.MID"
            },
            {
                humanName:"J. S. Bach — Aria of the Orchestral Suite n°3 (BWV 1068)",
                fileName:"Midi/003_Bach.MID"
            },
            {
                humanName:"The Beatles — Hey Jude",
                fileName:"Midi/004_Beatles_Hey_Jude.MID"
            },
            {
                humanName:"The Beatles — Hey Jude (Negative Harmony Revised)",
                fileName:"Midi/005_Beatles_Hey_Jude_NH-1.MID"
            },
        ],
    }},
    methods:{
        // Loads a Midi File from a file on disk
        fromFile: function () {
            if (window.FileReader) {
                var reader = new FileReader();
                var f = document.getElementById('file').files[0];
                _this = this;
                reader.onload = function(e) {
                    var data = '';
                    var bytes = new Uint8Array(e.target.result);
                    data = bytes.reduce((d,byte) => d+String.fromCharCode(byte),'')

                    _this.$emit('load',data, f.name);
                }
                ;
                reader.readAsArrayBuffer(f);
            } else
                console.log('File API is not supported in this browser.');
        },
        // Loads a distant Midi file
        fromURL: function (url) {
            //var url = document.getElementById('url').value;
            try {
                var xhttp = new XMLHttpRequest();
                _this = this;
                xhttp.onreadystatechange = function() {
                    if (this.readyState == 4) {
                        if (this.status == 200) {
                            var r = xhttp.responseText;
                            var data = '';
                            for (var i = 0; i < r.length; i++)
                                data += String.fromCharCode(r.charCodeAt(i) & 0xff);
                            _this.$emit('load',data, url);
                        }else{
                            console.log("Couldn't execute xhttp request.");
                        }
                    }
                }
                ;
                xhttp.overrideMimeType('text/plain; charset=x-user-defined');
                xhttp.open('GET', encodeURIComponent(url), true);
                xhttp.send();
            } catch (e) {
                console.log("Couldn't execute xhttp request.");
            }
        },
        // Loads the preset demo song
        fromBase64: function () {
            this.$emit('load', JZZ.lib.fromBase64(data), 'Base64 data');
        },
    },
    //TODO: Use localisation strings here too
    template: `
    <div>
        <div class="modal-background" v-on:click="$emit('cancel')"></div>
        <div class="modal">
            <p v-if="fileBrowser"><input type=file id=file size=40 v-on:change='fromFile()'></p><hr>
            <template v-for="song in files">
                <button @click="fromURL(song.fileName)" class="song-select">
                    {{song.humanName}}
                </button>
                <br/>
            </template>
            <!-- TODO: repair
            <form v-on:submit.prevent='fromURL()'>
                <input type=text id=url value='https://jazz-soft.net/demo/midi/furelise.mid' size=80>
                <button type=submit>Load from URL</button>
            </form> -->
        </div>
    </div>
    `
}

// Example data : 'Mary had a little lamb'
var data = '\
TVRoZAAAAAYAAQADAGRNVHJrAAAAGgD/AwtMaXR0bGUgTGFtYgD/UQMKLCsA/y8ATVRyawAAAPIA/wMF\
V29yZHMA/wEYQFRNYXJ5IFdhcyBBIExpdHRsZSBMYW1lZP8BA1xNYTL/AQNyeSAy/wEEd2FzIDL/AQJh\
IDL/AQNsaXQy/wEEdGxlIDL/AQVsYW1lLGT/AQQvTGl0Mv8BBHRsZSAy/wEFbGFtZSxk/wEEL0xpdDL/\
AQR0bGUgMv8BBWxhbWUsZP8BAy9NYTL/AQNyeSAy/wEEd2FzIDL/AQJhIDL/AQNsaXQy/wEEdGxlIDL/\
AQVsYW1lLDL/AQMvQSAy/wEDbGl0Mv8BBHRsZSAy/wEFbGFtZSAy/wEEd2FzIDL/AQRoZXIhAP8vAE1U\
cmsAAAC5AP8DBU11c2ljAMALZJBAfzJAAAA+fzI+AAA8fzI8AAA+fzI+AABAfzJAAABAfzJAAABAf1pA\
AAo+fzI+AAA+fzI+AAA+f1o+AApAfzJAAABDfzJDAABDf1pDAApAfzJAAAA+fzI+AAA8fzI8AAA+fzI+\
AABAfzJAAABAfzJAAABAf1pAAAo+fzI+AAA+fzI+AABAfzJAAAA+fzI+AAA8f2RAZABDZABIf1o8AABA\
AABDAABIAAr/LwA=';