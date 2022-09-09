import React from 'react';
import { RTCView as _RTCView, RTCSessionDescription, RTCPeerConnection, RTCIceCandidate, mediaDevices } from 'react-native-webrtc';
export const RTCView = React.forwardRef((props) => <_RTCView objectFit={props.objectFit} {...props} streamURL={props.streamURL.toURL()}/>)
export {
    RTCView,
    RTCSessionDescription,
    RTCPeerConnection,
    RTCIceCandidate,
    mediaDevices,
}