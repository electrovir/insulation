import {testString} from '../common/index';
import {doBackEndThing} from '../back-end/index';

export function doFrontEndThing() {
    console.log(testString);
    doBackEndThing();
}
