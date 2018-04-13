/* eslint-disable */
// import QiscusSDK from 'qiscus-sdk-core';
import QiscusSDK from './QiscusSDKCore.min';

// this part is only for browsers, but we need to get around this part
// so that build tool not complaining
global.qiscus = null;
export default (function QiscusStoreSingleton() {
  if (!global.qiscus) global.qiscus = new QiscusSDK();
  return global.qiscus;
})();
