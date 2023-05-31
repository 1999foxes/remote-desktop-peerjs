import WebRTCHelper from '../utils/WebRTCHelper.js';
import Lock from '../utils/Lock.js';


class RemoteDesktopStreamer extends HTMLElement {
    constructor() {
        super();

        this.webRTCHelper = new WebRTCHelper();

        this.shadow = this.attachShadow({ mode: 'open' });

        this.container = document.createElement('div');
        this.container.innerHTML = `
            <video id="video" autoplay muted playsinline></video>
            <div>
                <select id="configSelector"></select>
                <input id="startButton" type="button" value="start sharing">
            </div>
            <div id="divInfo"></div>
            <a id="streamLink" href="" hidden>Click to copy sharing link.</a>
        `;

        this.video = this.container.querySelector('#video');

        this.configSelector = this.container.querySelector('#configSelector');
        const configSelectorSelected = getLocalStorage('RemoteDesktopStreamerConfigSelectorValue') || 0;
        let configSelectorCount = 0;
        this.configSelector.addOption = (value, text) => {
            const option = document.createElement('option');
            option.value = value;
            option.innerText = text;
            option.selected = configSelectorCount++ == configSelectorSelected;
            this.configSelector.add(option);
        }
        this.configSelector.addOption(0, '1080p');
        this.configSelector.addOption(1, '2k');
        this.configSelector.addOption(2, '4k');
        this.configPresets = [
            { video: { height: 1080, frameRate: 60 }, audio: true },
            { video: { width: 2560, frameRate: 60 }, audio: true },
            { video: { width: 4500, frameRate: 60 }, audio: true },
        ]
        this.configSelector.onchange = e => {
            setLocalStorage('RemoteDesktopStreamerConfigSelectorValue', this.configSelector.value);
            if (this.mediaStream != null && this.webRTCHelper.mediaConn != null) {
                this.stopMediaStream();
                this.getMediaStreamFromDisplay();
            }
        };

        this.startButton = this.container.querySelector('#startButton');
        this.startButton.onclick = () => {
            this.startButton.disabled = true;
            this.run();
        }

        this.divInfo = this.container.querySelector('#divInfo');

        this.streamLink = this.container.querySelector('#streamLink');
        this.streamLink.href = '';
        this.streamLink.innerText = 'Click to copy sharing link.';
        this.streamLink.onclick = (e) => {
            e.preventDefault();
            navigator.clipboard.writeText(this.streamLink.href)
                .then(this.streamLink.innerText = 'Link is copied to clipboard!');
        }

        var style = document.createElement("style");
        style.textContent = `
            input, select {
                font-size: 1vw;
                margin: 1vw 0.2vw 1vw 0.2vw;
                padding: 0.2vw;
            }
            video {
                width: calc(min(100vw, max(60vh, 30vw)));
                background: black;
            }
            `;
        this.shadow.appendChild(style);

        this.shadow.appendChild(this.container);

        this.lock = new Lock();

        window.streamer = this;
    }

    connectedCallback() {
        console.log('RemoteDesktopStreamer');
    }

    disconnectedCallback() {
        console.log('RemoteDesktopStreamer removed');
        this.stop();
    }

    info(str) {
        this.divInfo.innerText = str;
    }

    stop() {
        this.webRTCHelper.disconnectAll();
        this.stopMediaStream();
        this.info('Terminated');
    }

    run() {
        this.lock.acquire()
            .then(() => this.getMediaStreamFromDisplay())
            .then(() => this.info("connecting to server..."))
            .then(() => this.webRTCHelper.connectServer())
            .then(() => {
                // generate stream link
                const url = new URL(window.location.href);
                const params = new URLSearchParams();
                params.append('otherPeerId', this.webRTCHelper.id);
                url.search = params.toString();
                this.streamLink.href = url.href;
                this.streamLink.hidden = false;
                this.info(`Your sharing code is ${this.webRTCHelper.id.replace('RemoteDesktop', '')}`);
            })
            .then(() => this.webRTCHelper.waitPeer())
            .then(() => this.info('Connected to viewer, start streaming...'))
            .then(() => {
                this.webRTCHelper.call(this.getMediaStream());
                this.webRTCHelper.waitClose().then(() => this.autoReconnect());
            })
            .then(() => this.info(''))
            .catch((err) => {
                console.error(err)
                this.info('Cannot connect to server, try again later');
                this.startButton.disabled = false;
                this.stop();
            })
            .finally(() => this.lock.release());
    }

    autoReconnect() {
        this.lock.acquire()
            .then(() => this.getMediaStream() == null ? this.getMediaStreamFromDisplay() : Promise.resolve())
            .then(() => this.info(`Your sharing code is ${this.webRTCHelper.id.replace('RemoteDesktop', '')}`))
            .then(() => this.webRTCHelper.waitPeer())
            .then(() => this.info('Connected to viewer, start streaming...'))
            .then(() => {
                this.webRTCHelper.call(this.getMediaStream());
                this.webRTCHelper.waitClose().then(() => this.autoReconnect());
            })
            .then(() => this.info(''))
            .catch((err) => {
                this.webRTCHelper.disconnectAll();
                this.startButton.disabled = false;
                console.error(err)
                this.info('Cannot connect to server, try again later');
            })
            .finally(() => this.lock.release());
    }

    getMediaStream() {
        if (this.mediaStream == null) {
            this.mediaStream = new MediaStream();
        }
        return this.mediaStream;
    }

    setMediaStream(mediaStream) {
        this.video.srcObject = mediaStream;
        this.webRTCHelper.replaceStream(mediaStream);
        this.mediaStream = mediaStream;
    }

    stopMediaStream() {
        this.mediaStream?.getTracks().forEach(track => track.stop());
    }

    async getMediaStreamFromDisplay() {
        this.setMediaStream(
            await navigator.mediaDevices.getDisplayMedia(
                this.configPresets[this.configSelector.value] || { audio: true, video: true }
            )
        )
    }
}


customElements.define('light-vr-desktop-streamer', RemoteDesktopStreamer);




function getLocalStorage(key) {
    return window.localStorage ? window.localStorage[key] : null;
}

function setLocalStorage(key, value) {
    if (window.localStorage) {
        window.localStorage[key] = value;
    }
}

window.RemoteDesktopStreamer = RemoteDesktopStreamer;

export default RemoteDesktopStreamer;
