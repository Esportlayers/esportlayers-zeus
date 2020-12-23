import {init} from '@esportlayers/morphling';
import { getObj, setObj } from './redis';

init(setObj, getObj);