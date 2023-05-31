class Lock {
    locked = false;

    acquire() {
        return new Promise((resolve, reject) => {
            const checkLock = () => {
                if (this.locked == false) {
                    this.locked = true;
                    console.log('lock');
                    resolve();
                } else {
                    window.setTimeout(
                        () => checkLock(),
                        0
                    );
                }
            };
            checkLock();
        })
    }

    release() {
        console.log('release');
        this.locked = false;
    }
}

export default Lock;
