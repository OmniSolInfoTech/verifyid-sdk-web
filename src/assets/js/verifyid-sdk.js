let selfie_photo = "";
let hostname = window.location.origin + "/";


let myWizard = $("#kyc-wizard");
let wizard = myWizard.steps({
    headerTag: "h3",
    bodyTag: "section",
    transitionEffect: "slideLeft",
    autoFocus: true,
    onStepChanging: function (event, currentIndex, newIndex) {
        if (currentIndex < newIndex) {
            if (currentIndex == 2 && newIndex == 3) {
                $("a[href$='previous']").hide();
                $("a[href$='next']").hide();
                resetSelfieUI();
                startup();
            }
            if (currentIndex == 3 && newIndex == 4) {
                $("a[href$='previous']").hide();
                $("a[href$='cancel']").hide();
                $("a[href$='finish']").hide();
                if ($('#selfie_photo').val() == "") {
                    return false;
                }
            }
        }
        return true;
    },
});

$('ul[role="tablist"]').hide(); // Hide progress tabs

$(document).ready(function () {
    $('.identity_document_type').on("change", function () {
        if ($(this).val() == "id_card") {
            $('.id_card_div').show();
            $('#passport_div').hide();
            $('#id_card_front').attr("required", true).val("");
            $('#id_card_back').attr("required", true).val("");
            $('#passport_front').removeAttr('required').val("");
        } else if ($(this).val() == "passport") {
            $('.id_card_div').hide();
            $('#passport_div').show();
            $('#id_card_front').removeAttr('required').val("");
            $('#id_card_back').removeAttr('required').val("");
            $('#passport_front').attr("required", true).val("");
        }
    });
});

let selfie_taken = false, stream = null, liveness = null, faceCanvas = null, lookCount = 0, noFace = 0;

function $video() {
    return document.getElementById('camera-stream');
}

function $overlay() {
    return document.getElementById('overlay');
}

function $errorMsg() {
    return document.getElementById('error-message');
}

function $helpMsg() {
    return document.getElementById('help_message');
}

function $controls() {
    return document.querySelector('.controls');
}

function $snapImg() {
    return document.getElementById('snap');
}

function resetSelfieUI() {
    let video = $video(), overlay = $overlay(), helpMsg = $helpMsg(), errorMsg = $errorMsg(), snapImg = $snapImg();
    if (video) video.classList.remove('visible');
    if (overlay) overlay.classList.remove('visible');
    if (errorMsg) {
        errorMsg.style.display = "none";
        errorMsg.classList.remove('visible');
    }
    if (helpMsg) helpMsg.textContent = "";
    if (snapImg) {
        snapImg.style.display = "none";
        snapImg.classList.remove('visible');
        snapImg.src = "";
    }
    selfie_taken = false;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (liveness) {
        clearInterval(liveness);
        liveness = null;
    }
    if (faceCanvas && faceCanvas.parentNode) {
        faceCanvas.parentNode.removeChild(faceCanvas);
        faceCanvas = null;
    }
}

async function startCamera() {
    resetSelfieUI(); // Always clean up before starting
    let video = $video(), overlay = $overlay(), helpMsg = $helpMsg(), errorMsg = $errorMsg();
    try {
        stream = await navigator.mediaDevices.getUserMedia({video: true, audio: false});
        video.srcObject = stream;
        // Wait until the video is actually playing (has dimensions)
        await video.play();
        video.classList.add('visible');
        if (overlay) overlay.classList.add('visible');
        if (helpMsg) helpMsg.textContent = "Checking Liveness...";
        if (errorMsg) errorMsg.style.display = "none";
        await new Promise(res => setTimeout(res, 200)); // Ensure video has correct width/height!
        setLivenessDetection(video,wizard);
    } catch (err) {
        if (errorMsg) {
            errorMsg.textContent = err.name === "NotAllowedError"
                ? "Camera access denied. Please grant permission."
                : err.name === "NotFoundError"
                    ? "No camera found."
                    : ("Camera error: " + err.message);
            errorMsg.style.display = "block";
            errorMsg.classList.add("visible");
        }
        resetSelfieUI();
    }
}

function setLivenessDetection(video,wizard) {
    let controls = $controls(), helpMsg = $helpMsg();

    // Clean up old canvas/interval
    if (faceCanvas && faceCanvas.parentNode) faceCanvas.parentNode.removeChild(faceCanvas);
    if (liveness) clearInterval(liveness);

    faceCanvas = faceapi.createCanvasFromMedia(video);
    faceCanvas.style.position = "absolute";
    faceCanvas.style.left = "0";
    faceCanvas.style.top = "0";
    faceCanvas.style.zIndex = 21;
    video.parentNode.appendChild(faceCanvas);

    if (controls) controls.classList.add("visible");
    const displaySize = {width: video.videoWidth, height: video.videoHeight};
    faceapi.matchDimensions(faceCanvas, displaySize);

    liveness = setInterval(async () => {
        let snapImg = $snapImg();
        if (!selfie_taken && video.videoWidth > 0 && video.videoHeight > 0) {
            const detections = await faceapi
                .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks().withFaceExpressions();
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            faceCanvas.getContext('2d').clearRect(0, 0, faceCanvas.width, faceCanvas.height);
            if (resizedDetections.length > 0 && resizedDetections[0].detection.score > 0.5) {
                const third = video.videoHeight / 3;
                if (resizedDetections[0].landmarks.imageHeight < third) {
                    if (helpMsg) helpMsg.textContent = "Please move closer and center your face in the red brackets.";
                } else if (resizedDetections[0].expressions.happy > 0.5) {
                    selfie_taken = true;
                    clearInterval(liveness);
                    var counter = 3;
                    var timer = setInterval(function () {
                        if (helpMsg) helpMsg.textContent = "";
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
                            submitKYCForm();
                        }
                    }, 1000);
                } else {
                    if (helpMsg) helpMsg.textContent = "Please Smile!";
                }
            } else {
                if (helpMsg) helpMsg.textContent = "Please look at the camera.";
                lookCount++;
                if (lookCount > 4) {
                    noFace++;
                    if (helpMsg) helpMsg.textContent = "Please find a room with more light.";
                    if (noFace > 15) {
                        if (helpMsg) helpMsg.textContent = "We cannot find your face and we are resetting this KYC.";
                        if (noFace == 16) {
                            location.reload();
                        }
                    }
                }
            }
        }
    }, 1500);
}

// Only call this after face-api models loaded!
async function startup() {
    let hostname = window.location.origin + "/";
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(hostname + 'sdk/face-api/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri(hostname + 'sdk/face-api/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri(hostname + 'sdk/face-api/models'),
        faceapi.nets.faceExpressionNet.loadFromUri(hostname + 'sdk/face-api/models'),
    ]);
    await startCamera();
}

// --- Take Photo & Pause Video ---
function take_photo() {
    let snapImg = $snapImg(), video = $video();
    const snap = takeSnapshot();
    snapImg.setAttribute('src', snap);
    snapImg.classList.add("visible");
    snapImg.style.display = "block";
    // Save selfie as Base64 string
    let base64_string = snap.split(",");
    selfie_photo = base64_string[1].trim();
    $('#selfie_photo').val(selfie_photo);
    video.pause();
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (faceCanvas && faceCanvas.parentNode) {
        faceCanvas.parentNode.removeChild(faceCanvas);
        faceCanvas = null;
    }
}

// --- Utility: Snapshot ---
function takeSnapshot() {
    let video = $video();
    var hidden_canvas = document.createElement('canvas');
    var width = video.videoWidth,
        height = video.videoHeight;
    if (width && height) {
        hidden_canvas.width = width;
        hidden_canvas.height = height;
        hidden_canvas.getContext('2d').drawImage(video, 0, 0, width, height);
        return hidden_canvas.toDataURL('image/png');
    }
    return "";
}

function hideUI() {
    let controls = $controls(), video = $video(), snapImg = $snapImg(), errorMsg = $errorMsg();
    if (controls) controls.classList.remove("visible");
    if (video) video.classList.remove("visible");
    if (snapImg) snapImg.classList.remove("visible");
    if (errorMsg) errorMsg.classList.remove("visible");
}

// --- Utility: KYC Submit (stub for your logic) ---

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve("");
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
async function submitKYCForm() {
    // Show waiting SweetAlert
    Swal.fire({
        title: 'Verifying...',
        html: 'Please wait while we verify your documents.<br/><br/><div class="spinner-border text-primary"></div>',
        allowOutsideClick: false,
        showConfirmButton: false
    });

    // Determine doc type
    const docType = document.querySelector('input[name="identity_document_type"]:checked')?.value;
    let frontFile = null, backFile = null;
    if (docType === "id_card") {
        frontFile = document.getElementById("id_card_front").files[0];
        backFile = document.getElementById("id_card_back").files[0];
    } else if (docType === "passport") {
        frontFile = document.getElementById("passport_front").files[0];
        backFile = null; // Not required for passport
    }

    const selfieBase64 = document.getElementById("selfie_photo").value; // Already base64 (no prefix)
    const frontBase64 = await fileToBase64(frontFile);
    const backBase64 = backFile ? await fileToBase64(backFile) : "";

    // API payload
    const payload = {
        front_image: frontBase64,
        back_image: backBase64,
        selfie_image: selfieBase64,
        threshold: 0.6
    };

    try {
        // Post to API
        const response = await fetch(window.SDK_CONFIG.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": window.SDK_CONFIG.apiKey
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            Swal.fire({
                icon: "success",
                title: "Verification Complete",
                html: `<pre>${JSON.stringify(result, null, 2)}</pre>`,
                confirmButtonText: "OK"
            }).then(
                window.location.reload()
            );
        } else {
            throw new Error(result.detail || "Unknown error");
        }
    } catch (err) {
        Swal.fire({
            icon: "error",
            title: "Submission Error",
            text: err.message
        });
    }
}
