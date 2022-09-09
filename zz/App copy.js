import React, { useEffect, useRef, useState } from 'react';
import { View, Button, TextInput, Text } from 'react-native';
import SocketIOClient from 'socket.io-client';
import { mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCView, RTCIceCandidate } from 'react-native-webrtc';
const configuration = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]};


let socket = SocketIOClient.connect("http://192.168.43.164", { transports: ["websocket"] })
let pcs = {};
let streams = {};
let _isAdmin = false;
let startRoom = false;
let thisId = ''
let stl = ''
let localRef = ''

const App = () => {
  const [user, setuser] = useState([])
  const [roomInput, setroomInput] = useState('')
  const [message, setmessage] = useState('')
  const [request1, setrequest] = useState([])
  const [admin, setadmin] = useState()



  useEffect(() => {
    socket.emit('online')
    socket.on('online', (id, roomAdminId) => {
      setadmin(roomAdminId)
      if (id) thisId = id
    })



let isFront = true;
mediaDevices.enumerateDevices().then(sourceInfos => {
  console.log(sourceInfos);
  let videoSourceId;
  for (let i = 0; i < sourceInfos.length; i++) {
    const sourceInfo = sourceInfos[i];
    if(sourceInfo.kind == "videoinput" && sourceInfo.facing == (isFront ? "front" : "environment")) {
      videoSourceId = sourceInfo.deviceId;
    }
  }
  mediaDevices.getUserMedia({
    audio: true,
    video: {
      width: 640,
      height: 480,
      frameRate: 30,
      facingMode: (isFront ? "user" : "environment"),
      deviceId: videoSourceId
    }
  })
  .then(stream => {
    localRef = stream
    setuser(user => user.concat({ id: 1, stream }))
    })
  .catch(error => {
    // Log error
  });
});



    socket.on('permission', async (room, socketId, data) => {
      if (data.type === "create") {
        room = room;
        _isAdmin = { room };
        startRoom = true
        setmessage('اتاق ساخته شد')
      }
      else if (data.type === "joinAdmin") {
        room = room;
        _isAdmin = { room };
        startRoom = true
        socket.emit('offer1', socketId, room)
      }
      else {
        if (data.type === "join") {
          setrequest(request => request.concat(socketId))
        }
      }
    })

    socket.on('reject', () => {
      alert('درخاست شما رد شد')
    })


    socket.on('offer1', async (socketId, room, allId) => {
      allId.forEach((socketId) => {
        if (!pcs[socketId]) {
          pcs[socketId] = new RTCPeerConnection(configuration);

          pcs[socketId].onaddstream = ({ stream }) => {
            // console.log('stream',stream);
            if (streams[socketId]?.id !== stream.id) {
              streams[socketId] = stream;
              setuser(user => user.concat({ id: socketId, stream }))
            }
          };

          localRef && pcs[socketId].addStream(localRef);
        }
      })
      if (socketId !== thisId) {
        let offer = await pcs[socketId].createOffer()
        pcs[socketId].setLocalDescription(offer);
        socket.emit('offer2', offer, socketId)
        pcs[socketId].onicecandidate = ({ candidate }) => { candidate && socket.emit('candidate', candidate, room) };
      }
    })



    socket.on('offer2', async (offer, socketId) => {
      if (socketId !== thisId) {
        startRoom = true
        pcs[socketId].setRemoteDescription(new RTCSessionDescription(offer));
        let answer = await pcs[socketId].createAnswer()
        pcs[socketId].setLocalDescription(answer);
        socket.emit('answer', answer, socketId)
      }
    })


    socket.on('answer', (answer, socketId) => {
      pcs[socketId].setRemoteDescription(new RTCSessionDescription(answer));
    })



    socket.on('candidate', (candidate, socketId) => {
      // console.log('candidate',candidate);
      pcs[socketId] && pcs[socketId].addIceCandidate(new RTCIceCandidate(candidate));
    })



    socket.on('leave', (socketId, call) => {
      if (call) {
        setuser((user) => user.filter((u) => u.id == 1))
        streams = {}
        pcs = []
        startRoom = false
      }
      if (!call) {
        setuser((user) => user.filter((u) => u.id != socketId))
        if (!pcs[socketId]) return;
        pcs[socketId].close();
        delete pcs[socketId];
        delete streams[socketId];
      }
    })

    return () => {
      socket.emit('leave', roomInput)
    }

  }, []);


  const joinBtn = () => {
    if (!roomInput) return;
    socket.emit('permission', roomInput, null)
  };


  const liveBtn = (socketId) => {
    if (!socketId) {
      socket.emit('leave', roomInput, null)
    }
    else { socket.emit('leave', roomInput, socketId) }
  };



  if (user.length === 1) {
    stl = { width: '99%', height: '99%' }
  }

  if (user.length === 2) {
    stl = { width: '99%', height: '49.9%' }
  }

  if (user.length > 2 && user.length <= 4) {
    stl = { width: '49.8%', height: '49.8%' }
  }

  if (user.length <= 6 && user.length > 4) {
    stl = { width: '33.1%', height: '49.8%', maxWidth: '50%' }
  }

  if (user.length <= 9 && user.length > 6) {
    stl = { width: '33.1%', height: '33.1%', maxWidth: '50%' }
  }

  if (user.length <= 12 && user.length > 9) {
    stl = { width: '33.1%', height: '24.8%', maxWidth: '50%' }
  }

  if (user.length <= 16 && user.length > 12) {
    stl = { width: '24.5%', height: '24.8%', margin: '.2%', maxWidth: '50%' }
  }


  return (
    <View style={{ height: '100%', flexDirection: 'row' }} >

      <View style={{ height: '100%', width: '70%' }} >
        {admin && !startRoom && <Text onPress={() => { socket.emit('permission', admin.room, admin.id) }} >{admin.id}</Text>}
        <View style={{ height: 28, width: '40%', flexDirection: 'row' }} >
          {!startRoom && <TextInput style={{ height: 33, borderWidth: 1 }} onChangeText={(text) => setroomInput(text)} />}
          {!startRoom && <Button onPress={joinBtn} title="Join" />}
          {startRoom && <Button onPress={() => liveBtn(null)} title="Leave" />}
        </View>

        <View style={{ flex: 1, width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }} >
          {user.map((user, i) => (
            <View key={i} style={[{ flexGrow: 1, backgroundColor: 'silver', borderWidth: .1 }, stl]}>
              {user.stream && <RTCView streamURL={user.stream.toURL()} objectFit={'cover'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              {_isAdmin.room == roomInput && user.id != 1 && <Button onPress={() => liveBtn(user.id)} style={{ position: "absolute", bottom: 2 }} title="click" />}
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: '99%', width: '28%', }} >
        {request1.map((id) => (
          <View key={id} style={{ height: 100, width: '100%', borderWidth: 1, alignItems: 'center', justifyContent: 'center', margin: 5 }} >
            <View style={{ height: '60%', width: '60%', alignItems: 'center', }} >
              <Text>{id}</Text>
            </View>
            <View style={{ height: '30%', width: '30%', flexDirection: 'row', alignContent: 'space-around' }} >
              <Button onPress={() => { socket.emit('offer1', id, roomInput); setrequest(r => r.filter((request) => request != id)) }} title="success" />
              <Button onPress={() => { socket.emit('reject', id); setrequest(r => r.filter((request) => request != id)) }} title="reject" />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
export default App