let selfieData = "";
let hostname = window.location.origin + "/";
// Initialize jQuery Steps
$(function () {
    $("#kyc-wizard").steps({
        headerTag: "h3",
        bodyTag: "section",
        transitionEffect: "slideLeft",
        autoFocus: true,
        onStepChanging: function (event, currentIndex, newIndex) {
            if (currentIndex < newIndex) {
                if (currentIndex == 2 && newIndex == 3) {
                    $("a[href$='previous']").hide();
                    $("a[href$='next']").hide();
                    startup();
                }
                if (currentIndex == 3 && newIndex == 4) {
                    $("a[href$='previous']").hide();
                    $("a[href$='cancel']").hide();
                    $("a[href$='finish']").hide();

                    if ($('#selfie_photo').val() == "") {
                        return false;
                    } else {
                        return true;
                    }
                }
            }
            return true;
        },
        onFinished: function () {
            submitKYCForm();
        }
    });

    $('ul[role="tablist"]').hide(); // Hide progress tabs
});

// References to all the element we will need.
var video = document.getElementById('camera-stream'),
    image = document.getElementById('snap'),
    start_camera = document.getElementById('start-camera'),
    selfie_photo = "",
    controls = document.querySelector('.controls'),
    error_message = document.getElementById('error-message'),
    selfie_taken = false,
    context = null,
    model = null,
    lookCount = 0,
    noFace = 0,
    liveness,
    ticker;

async function startup() {

    Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(hostname + 'sdk/face-api/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri(hostname + 'sdk/face-api/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri(hostname + 'sdk/face-api/models'),
        faceapi.nets.faceExpressionNet.loadFromUri(hostname + 'sdk/face-api/models'),
    ]).then(() => take_a_selfie())

};

function take_a_selfie() {
    //Start Camera
    navigator.mediaDevices.getUserMedia({
        video: true, audio: false
    }).then((stream) => showCam(stream)).catch((err) => showErr(err))

    function showCam(stream) {
        //Get Track
        // Create an object URL for the video stream and
        // set it as src of our HTLM video element.
        video.srcObject = stream
        // Play the video element to start the stream.
        video.play();
    }

    function showErr(err) {
        let message = err.name === "NotFoundError" ? "Please Attach Camera" :
            err.name === "NotAllowedError" ? "Please Grant Permission to Access Camera" : err
        displayErrorMessage(message);
    }
}

video.addEventListener('play', () => {
    video.addEventListener("loadedmetadata", function () {
        // Display the video stream and the controls.
        hideUI();
        video.classList.add("visible");
        controls.classList.add("visible");
        const canvas = faceapi.createCanvas(video);
        const third = video.clientHeight / 3;
        const displaySize = {width: video.clientWidth, height: video.clientHeight}
        faceapi.matchDimensions(canvas, displaySize)
        liveness = setInterval(async () => {
            if (!selfie_taken) {
                const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
                const resizedDetections = await faceapi.resizeResults(detections, displaySize)
                canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
                if (resizedDetections.length > 0 && resizedDetections[0].detection.score > 0.5) {
                    if (resizedDetections[0].landmarks.imageHeight < third) {
                        $("#help_message").text("Please move closer and center your face in the red brackets.");
                    } else if (resizedDetections[0].expressions.happy > 0.6) {
                        //take photo
                        selfie_taken = true;
                        clearInterval(liveness);
                        var counter = 3;
                        var timer = setInterval(function () {
                            $("#help_message").text("");
                            $('#countdown').remove();

                            var countdown = $('<span id="countdown">' + (counter == 0 ? '' : counter) + '</span>');
                            countdown.appendTo($('#help_message'));
                            setTimeout(() => {
                                if (counter > -1) {
                                    $('#countdown').css({'font-size': '40vw', 'opacity': 0});
                                } else {
                                    $('#countdown').css({'font-size': '10vw', 'opacity': 50});
                                }
                            }, 50);
                            counter--;
                            if (counter == -1) {
                                clearInterval(timer);
                                take_photo();
                                wizard.steps('next');
                                $('#submitForm').trigger('click');
                            }
                        }, 1000);
                    } else {
                        //Ask user to smile
                        $("#help_message").text("Please Smile!");
                    }
                } else {
                    //Ask user to move closer and put face in red square brackets
                    $("#help_message").text("Please look at the camera.");
                    lookCount++;
                    if (lookCount > 4) {
                        noFace++;
                        $("#help_message").text("Please find a room with more light.");
                        if(noFace > 15) {
                            $("#help_message").text("We can not find your face and we are resetting this KYC.");
                            if (noFace == 16){
                                location.reload();
                            }
                        }
                    }
                }
            }
        }, 1500)
    }, true)
});

// Mobile browsers cannot play video without user input,
// so here we're using a button to start it manually.
start_camera.addEventListener("click", function (e) {
    e.preventDefault();
    // Start video playback manually.
    video.play();
});

//Function to take photo
function take_photo() {
    snap = takeSnapshot();
    // Show image.
    image.setAttribute('src', snap);
    image.classList.add("visible");
    // Set the href attribute of the download button to the snap url.
    let base64_string = snap.split(",");
    selfie_photo = base64_string[1].trim();
    // Pause video playback of stream.
    video.pause();
};

function takeSnapshot() {
    // Here we're using a trick that involves a hidden canvas element.
    var hidden_canvas = document.querySelector('canvas'),
        context = hidden_canvas.getContext('2d');
    var width = video.videoWidth,
        height = video.videoHeight;
    if (width && height) {
        // Setup a canvas with the same dimensions as the video.
        hidden_canvas.width = width;
        hidden_canvas.height = height;
        // Make a copy of the current frame in the video on the canvas.
        context.drawImage(video, 0, 0, width, height);
        // Turn the canvas image into a dataURL that can be used as a src for our photo.
        return hidden_canvas.toDataURL('image/png');
    }
}

//delete photo and restart
function delete_photo() {
    // Hide image.
    image.setAttribute('src', "");
    selfie_photo.value = "";
    image.classList.remove("visible");
    selfie_taken = false;
    // Resume playback of stream.
    video.play();
}

function displayErrorMessage(error_msg, error) {
    error = error || "";
    if (error) {
        console.log(error);
    }
    error_message.innerText = error_msg;
    hideUI();
    error_message.classList.add("visible");
}

function hideUI() {
    // Helper function for clearing the app UI.
    controls.classList.remove("visible");
    start_camera.classList.remove("visible");
    video.classList.remove("visible");
    snap.classList.remove("visible");
    error_message.classList.remove("visible");
}

function setText(text) {
    document.getElementById("error-message").innerText = text;
}

function enterFullScreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();     // Firefox
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();  // Safari
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();      // IE/Edge
    }
};


$(document).ready(function () {
    $('.identity_document_type').on("change", function () {
        console.log('helloworld');
        if ($(this).val() == "id_card") {
            $('.id_card_div').show();
            $('#passport_div').hide();
            //set required
            $('#id_card_front').attr("required", true);
            $('#id_card_front').val("");
            $('#id_card_back').attr("required", true);
            $('#id_card_back').val("");
            $('#passport_front').removeAttr('required');
            $('#passport_front').val("");
        } else if ($(this).val() == "passport") {
            $('.id_card_div').hide();
            $('#passport_div').show();
            //set required
            $('#id_card_front').removeAttr('required');
            $('#id_card_front').val("");
            $('#id_card_back').removeAttr('required');
            $('#id_card_back').val("");
            $('#passport_front').attr("required", true);
            $('#passport_front').val("");
        }
    });

});
