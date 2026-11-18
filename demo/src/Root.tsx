import {Composition} from 'remotion';
import {Demo} from './Demo';
import timing from '../public/timing.json';

export const Root = () => (
  <Composition id="Demo" component={Demo} fps={30} width={1280} height={720}
    durationInFrames={Math.ceil(timing.duration * 30)} />
);
