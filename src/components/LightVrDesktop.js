import {} from './LightVrDesktopStreamer.js';
import {} from './LightVrDesktopViewer.js';


class LightVrDesktop extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        this.container = document.createElement('div');
        const otherPeerId = new URL(window.location.href).searchParams.get('otherPeerId');
        if (otherPeerId != undefined) {
            this.startViewer(otherPeerId);
        } else {
            const buttonStartStreamer = document.createElement('input');
            buttonStartStreamer.type = 'button';
            buttonStartStreamer.value = 'share desktop';
            buttonStartStreamer.onclick = () => {
                this.startStreamer();
            };

            const buttonStartViewer = document.createElement('input');
            buttonStartViewer.type = 'button';
            buttonStartViewer.value = 'view desktop';
            buttonStartViewer.onclick = () => {
                this.startViewer();
            }

            this.container.appendChild(buttonStartStreamer);
            this.container.appendChild(buttonStartViewer);
        }

        var style = document.createElement("style");
        style.textContent = `
            input {
                font-size: 1vw;
                margin: 1vw 0.2vw 1vw 0.2vw;
                padding: 0.2vw;
            }
            `;
        shadow.appendChild(style);

        shadow.appendChild(this.container);
    }

    startStreamer() {
        this.container.innerHTML = '';
        const streamer = document.createElement('light-vr-desktop-streamer');
        this.container.appendChild(streamer);
    }

    startViewer(otherPeerId = '') {
        this.container.innerHTML = '';
        const viewer = document.createElement('light-vr-desktop-viewer');
        viewer.setAttribute('otherPeerId', otherPeerId);
        this.container.appendChild(viewer);
    }
}
customElements.define('light-vr-desktop', LightVrDesktop);

export default LightVrDesktop;
