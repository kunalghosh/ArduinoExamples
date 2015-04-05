var connectionId = -1;

function setPosition(position) {
  var buffer = new ArrayBuffer(1);
  var uint8View = new Uint8Array(buffer);
  uint8View[0] = position;
  chrome.serial.send(connectionId, buffer, function() {});
};

var lock = false;
var arrayReceived=[]; //array of Uint8Arrays
function onRead(readInfo){
    // only append the newly available data to arrayReceived.
    arrayReceived = arrayReceived.concat(new Uint8Array(readInfo.data));
    process();//operates on the global arrayReceived array.
}

var readBuffer = ''; 
// made global because in one invocation a portion of a command could be sent.
// we want to the buffer to include incomplete commands from previous invocations of process() too.
// e.g. in one iteration process could only get 1a2c0a1
// and the next iteration could be a3c0a, so we want the one from the last invocation to paired up
// with a from the next invocation.
function process(){
    // synchronous function
    if(lock == false){
        lock = true;
        var command = '';
        for(var index=0; index < arrayReceived.length; index++){
            // iterate over all the Uint8Arrays. global variable arrayReceived.
            var uint8View = arrayReceived.shift();
            for(var innerIndex=0; innerIndex < uint8View.length; innerIndex++){
                var data = String.fromCharCode(uint8View[innerIndex]); 
                // data is always a single character. for 11 data is first 1 and then
                // in the next iteration another 1 is sent.
                console.log("data : " + data);
                if(data === 'a' || data === 'b' || data === 'c'){
                    command = data;
                    performAction(command,readBuffer);
                    command = '';
                    readBuffer = '';
                    data = '';
                }
                readBuffer += data;
            }
        }
        lock = false;
    }
}

function performAction(value,readBuffer){  
  if (value == "a") // Light on and off
  {
      console.log("CMD[a]: " + readBuffer);
      var opat = isNaN(parseInt(readBuffer)) ? 0 : parseInt(readBuffer);
      
      document.getElementById('image').style.opacity = (opat* 0.7) + 0.3;
  }
  else if (value == "b") // Return blink length value
  {
  }
  else if (value == "c") // Blink Count
  {
      console.log("CMD[c]: " + readBuffer);
      document.getElementById('blinkCount').innerText = readBuffer;
  }
};

function onOpen(openInfo) {
  connectionId = openInfo.connectionId;
  console.log("connectionId: " + connectionId);
  if (connectionId == -1) {
    setStatus('Could not open');
    return;
  }
  setStatus('Connected');

  setPosition(0);
  chrome.serial.onReceive.addListener(onRead);
};

function setStatus(status) {
  document.getElementById('status').innerText = status;
}

function buildPortPicker(deviceInfoList) {
  var eligiblePorts = deviceInfoList.filter(function(deviceInfo) {
      var port = deviceInfo.path;
    return !port.match(/[Bb]luetooth/) && port.match(/\/dev\/tty/);
  });

  var portPicker = document.getElementById('port-picker');
  eligiblePorts.forEach(function(port) {
    var portOption = document.createElement('option');
    console.log(port.path);
    portOption.value = portOption.innerText = port.path;
    portPicker.appendChild(portOption);
  });

  portPicker.onchange = function() {
    if (connectionId != -1) {
      chrome.serial.close(connectionId, openSelectedPort);
      return;
    }
    openSelectedPort();
  };
}

function openSelectedPort() {
    var portPicker = document.getElementById('port-picker');
    var selectedPortObject = portPicker.options[portPicker.selectedIndex]
    if(typeof selectedPortObject !== 'undefined'){
        var selectedPort = selectedPortObject.value;
        console.log("selected port " + selectedPort);
        chrome.serial.connect(selectedPort,{'bitrate':9600}, onOpen);
    }else{
        setTimeout(checkConnection,3000); 
        // this is to ensure that if someone launches the app 
        // before pluging in the arduino. The app doesn't sit there doing nothing.
    }
}

onload = function() {

    document.getElementById('position-input').onchange = function() {
        setPosition(parseInt(this.value, 10));
    };
    checkConnection();
};

function checkConnection(){
    console.log("Checking connection.");
    chrome.serial.getDevices(function(deviceInfoList) {
        // for (var i=0; i<deviceInfoList.length; i++){
        //   console.log(deviceInfoList[i].path);
        // }
        buildPortPicker(deviceInfoList)
        openSelectedPort();
    });
}
