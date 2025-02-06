import { createHistogram, version } from 'jsroot';
import {subject} from "../rxjs/FunctionSubject.js";

const initJsroot = () => {
   console.log(version);

   const histo = createHistogram('TH3I', 20, 20, 20);
   histo.fXaxis.fXmin = -10;
   histo.fXaxis.fXmax = 10;
   histo.fYaxis.fXmin = -10;
   histo.fYaxis.fXmax = 10;
   histo.fZaxis.fXmin = -10;
   histo.fZaxis.fXmax = 10;
   histo.fName = 'generated';
   histo.fFillColor = 3;
   console.log('histo: ', histo);
   subject.next(histo);
}

export default initJsroot;