
export class webSocketConnector {
    ws = null;
    reconnect_timer = null;
    connecting = false;
    reconnect() {
        this.reconnect_timer = setInterval(() => {
            if (!this.connecting) this.init(true);
        }, 1000);
    }

    init(reconnection = false) {
        this.connecting = true;
        this.ws = new WebSocket("ws://localhost:8765");
        let that = this;
        this.ws.onopen = () => {
            console.log("connected!");
            that.connecting = false;

            if (that.reconnect_timer) clearInterval(that.reconnect_timer);
        }
        this.ws.onerror = (ev) => {
            if (that.ws != null) {
                console.log("error happens");
                that.ws.close();
            } else {
                console.log("connect failed");
            }
            that.connecting = false;
            that.reconnect();
        }
    }
}