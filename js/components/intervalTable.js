//Table displaying the interval content
let intervalTable = {
    props:{
        notes:{
            type:Array,
            required: true
        }
    },
    computed:{
        intervalContent: function(){
            let length = this.notes.length
            let result = Array(length).fill(0)
            for(index1 of range(0,length)){
                if(this.notes[index1].count){
                    for(index2 of range(0,length)){
                        if(this.notes[index2].count){
                            result[mod(index2-index1,12)]+=1
                        }
                    }
                }
            }
            return result
        }
    },
    template:`
    <table style="width:100%">
        <tr>
            <th>Interval</th>
            <th v-for="ic,key,index in intervalContent">{{key}}</th>
        </tr>
        <tr>
            <th>Content</th>
            <th v-for="ic,key,index in intervalContent">{{ic}}</th>
        </tr>
    </table>
    `
}



var Tonnetz_intervalTable = true