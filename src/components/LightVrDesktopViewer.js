import WebRTCHelper from '/src/utils/WebRTCHelper.js';
import Lock from '/src/utils/Lock.js';

class LightVrDesktopViewer extends HTMLElement {
    constructor() {
        super();

        this.webRTCHelper = new WebRTCHelper();

        this.shadow = this.attachShadow({ mode: 'open' });

        this.container = document.createElement('div');
        this.container.innerHTML = `
            <video id="video" controls autoplay playsinline></video>
            <div id="divInfo"></div>
            <div>
                <input id="inputCode" type="text" placeholder="sharing code">
                <input id="buttonStartViewer" type="button" value="view desktop">
            </div>
        `;

        this.video = this.container.querySelector('#video');

        this.divInfo = this.container.querySelector('#divInfo');

        this.inputCode = this.container.querySelector('#inputCode');
        this.inputCode.oninput = () => {
            this.inputCode.value = [...this.inputCode.value]
                .filter(c => c.charCodeAt() >= '0'.charCodeAt() && c.charCodeAt() <= '9'.charCodeAt())
                .join('');
            this.setAttribute('otherPeerId', 'LightVrDesktop' + this.inputCode.value);
        };
        this.inputCode.onkeydown = e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.buttonStartViewer?.click();
            }
        }

        this.buttonStartViewer = this.container.querySelector('#buttonStartViewer');
        this.buttonStartViewer.onclick = () => {
            const otherPeerId = this.getOtherPeerId();
            if (otherPeerId != null) {
                if (this.webRTCHelper.peer?.disconnected == false) {
                    this.buttonStartViewer.disabled = true;
                    this.forceReconnect(otherPeerId)
                        .finally(() => this.buttonStartViewer.disabled = false);
                } else {
                    this.run(otherPeerId);
                }
            } else {
                this.info('Input your code to continue.')
            }

            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                console.log('request permisson');
                DeviceMotionEvent.requestPermission();
            }
        }

        const style = document.createElement("style");
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

        window.viewer = this;
    }

    info(str) {
        this.divInfo.innerText = str;
    }

    connectedCallback() {
        console.log('LightVrDesktopViewer');

        const otherPeerId = this.getOtherPeerId();
        if (otherPeerId != null) {
            this.inputCode.value = otherPeerId.replace('LightVrDesktop', '');
        } else {
            console.log('cannot get otherPeerId');
        }
    }

    disconnectedCallback() {
        console.log('LightVrDesktopViewer removed');
        this.webRTCHelper.disconnectAll();
    }

    getOtherPeerId() {
        const otherPeerId = this.getAttribute('otherPeerId');
        console.log('otherPeerId = ' + otherPeerId);
        if (otherPeerId != undefined && otherPeerId.length != 0 && otherPeerId !== 'LightVrDesktop') {
            return otherPeerId;
        } else {
            return null;
        }
    }

    async connectStreamer(otherPeerId) {
        this.webRTCHelper.connectPeer(otherPeerId);  // don't await this

        this.mediaStream = await this.webRTCHelper.waitCall();
        this.video.srcObject = this.mediaStream;

        this.info('');
    }

    async run(otherPeerId) {
        await this.lock.acquire();
        try {
            this.info("Connecting...");
            await this.webRTCHelper.connectServer();
            await this.connectStreamer(otherPeerId);
            this.webRTCHelper.waitClose().then(() => this.reconnect(otherPeerId));
        } catch (err) {
            throw err;
        } finally {
            this.lock.release();
        }
    }

    async reconnect(otherPeerId) {
        await this.lock.acquire();
        try {
            this.info("Reconnecting...");
            await this.connectStreamer(otherPeerId);
        } finally {
            this.lock.release();
        }
    }

    async forceReconnect(otherPeerId) {
        await this.lock.acquire();
        try {
            // disable auto reconnection
            const tmp = this.reconnect;
            this.reconnect = () => { };

            this.webRTCHelper.disconnectPeer();
            await this.connectStreamer(otherPeerId);

            // enable auto reconnection
            this.reconnect = tmp;
            this.webRTCHelper.waitClose().then(() => this.reconnect(otherPeerId));
        } finally {
            this.lock.release();
        }
    }
}

customElements.define('light-vr-desktop-viewer', LightVrDesktopViewer);


export default LightVrDesktopViewer;
