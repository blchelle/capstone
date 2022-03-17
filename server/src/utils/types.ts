export interface RaceData {
    roomId: string,
    hasStarted: boolean,
    isPublic: boolean,
    start: Date,
    passage: string
    users: string []
}

export interface Message {
    type: string;
}

export interface OutMessage extends Message{

}

export interface InMessage extends Message{

}

export interface RaceDataMessage extends OutMessage {
    type: 'raceData';
    raceInfo: RaceData;
}

export interface RaceUpdateMessage extends OutMessage {
    type: 'update';
    update: any;
}

export interface ConnectPublicMessage extends InMessage {
    type: 'connect_public';
    public: boolean;
}

export interface ConnectPrivateMessage extends InMessage {
    type: 'connect_private';
    public: boolean;
    roomId: string;
}

export interface StartMessage extends InMessage {
    type: 'start';
}