import {observable, action, decorate} from "mobx";

class StateCount {
    static count= 0

    reset(){
        count = 0;
    }

    add(){
        count += 1;
    }
}

decorate(StateCount, {
    count: observable,
    reset: action,
    add: action,
})


export default StateCount