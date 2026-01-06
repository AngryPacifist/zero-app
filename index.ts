// Entry point - redirects to src/App.tsx
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import { registerRootComponent } from 'expo';
import App from './src/App';

registerRootComponent(App);
