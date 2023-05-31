class WebRTCHelper {
    eventHandler = {};

    debug(message) {
        console.log(message);
    }

    disconnectAll() {
        this.conn?.close();
        this.mediaConn?.close();
        this.peer?.disconnect();
        this.peer?.destroy();
        this.conn = null;
        this.mediaConn = null;
        this.peer = null;
        this.id = null;
        return Promise.resolve();
    }

    disconnectPeer() {
        this.conn?.close();
        this.mediaConn?.close();
        this.conn = null;
        this.mediaConn = null;
        return Promise.resolve();
    }

    connectServer() {
        return new Promise((resolve, reject) => {
            if (this.id == null) {
                // get a random id
                const rand = Math.floor(Math.random() * 1000000);
                this.id = 'RemoteDesktop' + rand.toString().padStart(6, '0');
            }
            // connect to peer server
            this.peer = new Peer(this.id);
            this.peer.on('open', id => {
                this.debug('connected as ' + id);
                resolve();
            });
            this.peer.on('error', err => {
                console.error(err);
                reject(err);
            });
        });
    }

    connectPeer(otherPeerId) {
        return new Promise((resolve, reject) => {
            this.conn = this.peer.connect(otherPeerId);

            this.conn.removeAllListeners('open');
            this.conn.on('open', () => {
                this.debug('connected to ' + otherPeerId);
                resolve();
            });

            this.waitClosePromise = new Promise(resolve => this.resolveWaitClose = resolve);
            this.conn.removeAllListeners('close');
            this.conn.on('close', () => {
                this.debug('disconnected from ' + otherPeerId);
                this?.resolveWaitClose();
            });

            this.conn.removeAllListeners('data');
            this.conn.on('data', data => {
                this.handleData(data);
            })

            this.conn.removeAllListeners('error');
            this.conn.on('error', err => {
                console.error(err);
                reject(err);
            });
        });
    }

    waitPeer() {
        return new Promise((resolve, reject) => {
            this.peer.removeAllListeners('connection');
            this.peer.on('connection', (conn) => {
                this.conn = conn;

                this.conn.removeAllListeners('open');
                this.conn.on('open', () => {
                    this.debug('connected to ' + this.conn.peer);
                    resolve();
                });

                this.waitClosePromise = new Promise(resolve => this.resolveWaitClose = resolve);
                this.conn.removeAllListeners('close');
                this.conn.on('close', () => {
                    this.debug('disconnected from peer');
                    this?.resolveWaitClose();
                });

                this.conn.removeAllListeners('data');
                this.conn.on('data', data => {
                    this.handleData(data);
                })

                this.conn.removeAllListeners('error');
                this.conn.on('error', err => {
                    console.error(err);
                    reject(err);
                });
            });
        });
    }

    waitClose() {
        if (this.waitClosePromise == null) {
            throw new Error('waitClose before connection');
        }
        return this.waitClosePromise;
    }

    sendEvent(event) {
        this.conn?.send(event)
    }

    addEventListener(type, handler) {
        if (this.eventHandler[type] == undefined) {
            this.eventHandler[type] = [];
        }
        this.eventHandler[type].push(handler);
    }

    removeAllEventListeners(type) {
        if (type == undefined) {
            this.eventHandler = {};
        } else {
            this.eventHandler[type] = [];
        }
    }

    handleData(data) {
        if (data.type == null) {
            return;
        }
        this.eventHandler[data.type]?.forEach(handler => {
            this.debug(data, handler);
            handler(data);
        })
    }

    call(mediaStream) {
        return new Promise((resolve, reject) => {
            this.waitClose().then(reject);
            this.mediaConn?.close();
            this.mediaConn = this.peer.call(this.conn.peer, mediaStream);
            resolve();
        });
    }

    waitCall() {
        return new Promise((resolve, reject) => {
            this.waitClose().then(reject);

            this.peer.removeAllListeners('call');
            this.peer.on('call', call => {

                this.debug('on call');
                this.mediaConn = call;
                this.mediaConn.answer();

                this.mediaConn.removeAllListeners('stream');
                this.mediaConn.on('stream', remoteMediaStream => {
                    this.debug('on stream');
                    resolve(remoteMediaStream);
                });

                this.mediaConn.removeAllListeners('error');
                this.mediaConn.on('error', err => {
                    console.error(err);
                    reject(err);
                });
            });
        });
    }

    replaceStream(mediaStream) {
        mediaStream.getTracks().forEach(track => {
            this?.mediaConn?.peerConnection
                .getSenders()
                .find(s => s.track.kind == track.kind)
                ?.replaceTrack(track);
        });
    }
}

export default WebRTCHelper;