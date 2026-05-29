const osc = require("osc");

// Config
const LISTEN_HOST = "127.0.0.1";
const LISTEN_PORT = 9100;

const FORWARD_HOST = "127.0.0.1";
const FORWARD_PORT = 9000;

// Your sample implies:
// X -0.183052 * 45 = -8.23735 yaw
// Y  0.389886 * -45 = -17.54489 pitch
const EYE_DEGREES_SCALE = 45;

// State
const eyeState = {
  LeftEyeX: null,
  LeftEyeY: null,
  RightEyeX: null,
  RightEyeY: null,
};

// OSC UDP Ports
const inputPort = new osc.UDPPort({
  localAddress: LISTEN_HOST,
  localPort: LISTEN_PORT,
  metadata: true,
});

const outputPort = new osc.UDPPort({
  remoteAddress: FORWARD_HOST,
  remotePort: FORWARD_PORT,
  metadata: true,
});

// Helpers
function firstFloatArg(message) {
  if (!message.args || message.args.length === 0) return null;

  const arg = message.args[0];

  if (typeof arg === "number") return arg;
  if (arg && typeof arg.value === "number") return arg.value;

  return null;
}

function send(message) {
  outputPort.send(message);
  console.log("Forwarded:", message);
}

function sendEyeTrackingIfReady() {
  const {
    LeftEyeX,
    LeftEyeY,
    RightEyeX,
    RightEyeY,
  } = eyeState;

  // Only send once we have all 4 components
  if (
    LeftEyeX === null ||
    LeftEyeY === null ||
    RightEyeX === null ||
    RightEyeY === null
  ) {
    return;
  }

  const leftPitch = -LeftEyeY * EYE_DEGREES_SCALE;
  const leftYaw = LeftEyeX * EYE_DEGREES_SCALE;

  const rightPitch = -RightEyeY * EYE_DEGREES_SCALE;
  const rightYaw = RightEyeX * EYE_DEGREES_SCALE;

  send({
    address: "/tracking/eye/LeftRightPitchYaw",
    args: [
      { type: "f", value: leftPitch },
      { type: "f", value: leftYaw },
      { type: "f", value: rightPitch },
      { type: "f", value: rightYaw },
    ],
  });
}

function handleMessage(message) {
  console.log("Received:", message);

  const address = message.address;

  // Map eyelid params:
  // /RightEyeLid -> /avatar/parameters/RightEyeLid
  // /LeftEyeLid  -> /avatar/parameters/LeftEyeLid
if (address === "/RightEyeLid" || address === "/LeftEyeLid") {
  const value = firstFloatArg(message);

  if (value === null) {
    console.warn(`Ignoring ${address}: no float argument found`);
    return;
  }
  // We reverse here as 0 is closed according to Babble but 1 is closed according to the parameter
  const reversedValue = 1 - value;

  send({
    ...message,
    address: `/avatar/parameters${address}`,
    args: [
      { type: "f", value: reversedValue },
    ],
  });

  return;
}

  // Map incoming eye X/Y values to VRC eye tracking OSC format.
  const eyeMap = {
    "/LeftEyeX": "LeftEyeX",
    "/LeftEyeY": "LeftEyeY",
    "/RightEyeX": "RightEyeX",
    "/RightEyeY": "RightEyeY",
  };

  if (Object.prototype.hasOwnProperty.call(eyeMap, address)) {
    const value = firstFloatArg(message);

    if (value === null) {
      console.warn(`Ignoring ${address}: no float argument found`);
      return;
    }

    eyeState[eyeMap[address]] = value;
    sendEyeTrackingIfReady();

    // Do not forward original /LeftEyeX etc.,
    // because they are replaced by /tracking/eye/LeftRightPitchYaw.
    return;
  }

  // Forward everything else unchanged
  send(message);
}

// Bundle handling
function handlePacket(packet) {
  if (packet.packets && Array.isArray(packet.packets)) {
    for (const subPacket of packet.packets) {
      handlePacket(subPacket);
    }
    return;
  }

  if (packet.address) {
    handleMessage(packet);
  }
}

// Startup
outputPort.open();

outputPort.on("ready", () => {
  inputPort.open();
});

inputPort.on("ready", () => {
  console.log(`Listening for OSC on ${LISTEN_HOST}:${LISTEN_PORT}`);
  console.log(`Forwarding OSC to ${FORWARD_HOST}:${FORWARD_PORT}`);
});

inputPort.on("message", handleMessage);

inputPort.on("bundle", handlePacket);

inputPort.on("error", (err) => {
  console.error("Input OSC error:", err);
});

outputPort.on("error", (err) => {
  console.error("Output OSC error:", err);
});