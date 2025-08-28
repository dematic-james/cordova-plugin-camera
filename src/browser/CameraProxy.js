/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 */

const HIGHEST_POSSIBLE_Z_INDEX = 2147483647;
let localMediaStream;

function takePicture (success, error, opts) {
    if (opts && opts[2] === 1) {
        capture(success, error, opts);
    } else {
        const input = document.createElement('input');
        input.style.position = 'relative';
        input.style.zIndex = HIGHEST_POSSIBLE_Z_INDEX;
        input.className = 'cordova-camera-select';
        input.type = 'file';
        input.name = 'files[]';

        input.onchange = function (inputEvent) {
            const reader = new FileReader(); /* eslint no-undef : 0 */
            reader.onload = function (readerEvent) {
                input.parentNode.removeChild(input);

                const imageData = readerEvent.target.result;

                return success(imageData);
            };

            reader.readAsDataURL(inputEvent.target.files[0]);
        };

        document.body.appendChild(input);
    }
}

function capture (success, errorCallback, opts) {
    let targetWidth = opts[3];
    let targetHeight = opts[4];
    const customCameraContainer = opts[12];
    const customCaptureButton = opts[13];
    const customCancelButton = opts[14];

    const customElements = {customCameraContainer, customCaptureButton, customCancelButton};

    const parent = customCameraContainer ? document.getElementById(customCameraContainer) : createCameraContainer();
    const video = createVideoStreamContainer(parent, targetWidth, targetHeight);
    const captureButton = customCaptureButton ? document.getElementById(customCaptureButton) : createButton(parent, 'Capture');
    const cancelButton = customCancelButton ? document.getElementById(customCancelButton) : createButton(parent, 'Cancel');
    // start video stream
    startLocalMediaStream(errorCallback, video);

    // handle button click events
    handleCaptureButton(success, errorCallback, captureButton, video, customElements);
    handleCancelButton(errorCallback, cancelButton, video, customElements);
}


function createCameraContainer () {
    let parent = document.createElement('div');
    parent.style.position = 'relative';
    parent.style.zIndex = HIGHEST_POSSIBLE_Z_INDEX;
    parent.className = 'cordova-camera-capture';
    document.body.appendChild(parent);

    return parent;
}

function createVideoStreamContainer (parent, targetWidth, targetHeight) {
    targetWidth = targetWidth === -1 ? 320 : targetWidth;
    targetHeight = targetHeight === -1 ? 240 : targetHeight;

    let video = document.createElement('video');
    video.width = targetWidth;
    video.height = targetHeight;

    parent.appendChild(video);

    return video;
}

function createButton (parent, innerText) {
    let button = document.createElement('button');
    button.innerHTML = innerText;

    parent.appendChild(button);

    return button;
}

function handleCaptureButton (successCallback, errorCallback, captureButton, video, customElements) {
    captureButton.onclick = function () {
// create a canvas and capture a frame from video stream
        const canvas = document.createElement('canvas');
        canvas.width = video.width;
        canvas.height = video.height;
        canvas.getContext('2d').drawImage(video, 0, 0, video.width, video.height);

        // convert image stored in canvas to base64 encoded image
        const imageData = canvas.toDataURL('image/png');

        stopLocalMediaStream(video, customElements);

        return successCallback(imageData);
    };
}

function handleCancelButton (errorCallback, cancelButton, video, customElements) {
    cancelButton.onclick = function () {
        // stop video stream
        stopLocalMediaStream(video, customElements);
        errorCallback("Cancelled");
    };
}

function startLocalMediaStream (errorCallback, video) {
    navigator.getUserMedia = navigator.getUserMedia ||
                             navigator.webkitGetUserMedia ||
                             navigator.mozGetUserMedia ||
                             navigator.msGetUserMedia;

    const successCallback = function (stream) {
        localMediaStream = stream;
        if ('srcObject' in video) {
            video.srcObject = localMediaStream;
        } else {
            video.src = window.URL.createObjectURL(localMediaStream);
        }
        video.play();
    };

    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
            .then(successCallback)
            .catch(errorCallback);
    } else if (navigator.getUserMedia) {
        navigator.getUserMedia( {video: { facingMode: "environment" }, audio: false }, successCallback, errorCallback);
    } else {
        alert('Browser does not support camera :(');
    }
}

function stopLocalMediaStream (video, customElements) {
    // stop video stream, remove video and button.
    // Note that MediaStream.stop() is deprecated as of Chrome 47.
    if (localMediaStream.stop) {
        localMediaStream.stop();
    } else {
        localMediaStream.getTracks().forEach(function (track) {
            track.stop();
        });
    }

    // remove newly created elements
    removeAppendedCameraElements(video, customElements);
}

function removeAppendedCameraElements (video, customElements) {
    const parent = video.parentNode;

    if (!customElements.customCameraContainer) {
        parent.parentNode.removeChild(parent);
    } else if (!customElements.customCaptureButton && !customElements.customCancelButton) {
        while (parent.hasChildNodes()) {
            parent.removeChild(parent.lastChild);
        }
    } else if (parent.hasChildNodes() && !customElements.customCaptureButton) {
        parent.removeChild(video);
        parent.removeChild(parent.lastChild);
    } else if (parent.hasChildNodes() && !customElements.customCancelButton) {
        parent.removeChild(video);
        parent.removeChild(parent.lastChild);
    } else {
        parent.removeChild(video);
    }
}

module.exports = {
    takePicture,
    cleanup: function () {}
};

require('cordova/exec/proxy').add('Camera', module.exports);