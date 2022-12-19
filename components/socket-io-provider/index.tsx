import React from "react";
import { useRouter } from "next/router";
import { io, Socket } from "socket.io-client";
import { SOCKET_IO_CLIENT } from "../../common";
import catchErrors from "../../core/catch-errors";
import { useAppDispatch } from "../../hooks/useGlobalState";
import { resetCallStore } from "../../hooks/useWebRTC";
import { setCallId, setChatInfo, setModalVisible, setStatus, setUsers } from "../../state/calls/slice";
import { setSystemError } from "../../state/error/slice";
import { setFriendNotification, setGlobalInCall } from "../../state/main/slice";
import { setMessage, setTempChat, setWriteMessage } from "../../state/messages/slice";
import { CallStatus, Pages, SocketActions, SocketChannelErrorTypes } from "../../types/enums";
import { IUser } from "../../types/models.types";
import { ClientToServerEvents, ServerToClientEvents } from "../../types/socket.types";

export const SocketIOClient = React.createContext<Socket<ServerToClientEvents, ClientToServerEvents> | undefined>(undefined);

interface ISocketIOProvider {
    user: IUser;
    children: JSX.Element;
};

export default function SocketIOProvider({ user, children }: ISocketIOProvider) {
    const socketRef = React.useRef<Socket<ServerToClientEvents, ClientToServerEvents>>();

    const dispatch = useAppDispatch();
    const router = useRouter();

    // Инициализируем сокет, обрабатываем все сокет-ендпоинты
    React.useEffect(() => {
        if (socketRef.current) {
            socketRef.current.connect();
        } else if (typeof window !== "undefined") {
            socketRef.current = io(SOCKET_IO_CLIENT, { transports: ["websocket"] });
        }

        if (socketRef.current) {
            socketRef.current.auth = { user };

            socketRef.current.on("connect", () => {
                if (socketRef.current) {
                    // Список всех онлайн пользователей
                    socketRef.current.on(SocketActions.GET_ALL_USERS, (allUsers) => {
                        console.log('Юзеры онлайн: ', allUsers);
                    });

                    // Новый пользователь онлайн
                    socketRef.current.on(SocketActions.GET_NEW_USER, (newUser) => {
                        console.log('Новый юзер: ', newUser);
                    });

                    // Подписываемся на пользователя
                    socketRef.current.on(SocketActions.ADD_TO_FRIENDS, () => {
                        dispatch(setFriendNotification(1));
                    });

                    // Отписываемся от пользователя
                    socketRef.current.on(SocketActions.UNSUBSCRIBE, () => {
                        dispatch(setFriendNotification(-1));
                    });

                    // Получаем сообщение от пользователя
                    socketRef.current.on(SocketActions.SEND_MESSAGE, (message) => {
                        // console.log("===Пришло сообщение=====", message, window.location.pathname);

                        if (window.location.pathname.toLowerCase() === Pages.messages + "/" + message.chatId.toLowerCase()) {
                            dispatch(setMessage({ message, isVisibleUnReadMessages: message.id, updateCounter: true }));
                            dispatch(setWriteMessage(false));

                            // Чтение сообщения
                            // Request.post(ApiRoutes.readMessage, { ids: [message.id] }, undefined, undefined, 
                            //     (error: any) => CatchErrors.catch(error, router, dispatch)
                            // );
                        }
                    });

                    // Сохраняем временный chatId
                    socketRef.current.on(SocketActions.SET_TEMP_CHAT_ID, ({ chatId, userFrom, userTo }) => {
                        if (chatId && userFrom && userTo) {
                            dispatch(setTempChat({ chatId, userFrom, userTo }));
                        }
                    });

                    // Добавляем сообщение в массив сообщений для отрисовки (не нужно помечать как непрочитанное и тд)
                    // Здесь просто выводим сообщение и всё
                    socketRef.current.on(SocketActions.ADD_NEW_MESSAGE, ({ newMessage }) => {
                        dispatch(setMessage({ message: newMessage }));
                    });

                    // Отрисовываем сообщение о том, что собеседник набирает сообщение
                    socketRef.current.on(SocketActions.NOTIFY_WRITE, ({ isWrite }) => {
                        dispatch(setWriteMessage(isWrite));
                    });

                    // Меня уведомляют о новом звонке (одиночный/групповой)
                    socketRef.current.on(SocketActions.NOTIFY_CALL, ({ roomId, chatInfo, users }) => {
                        if (roomId && chatInfo && users && users.length) {
                            if (chatInfo.isSingle) {
                                dispatch(setChatInfo({
                                    ...chatInfo,
                                    chatName: users[0].friendName,
                                    chatAvatar: users[0].avatarUrl
                                }));
                            } else {
                                dispatch(setChatInfo(chatInfo));
                            }

                            dispatch(setModalVisible(true));
                            dispatch(setStatus(CallStatus.NEW_CALL));
                            dispatch(setCallId(roomId));
                            dispatch(setUsers(users));

                            // Уведомляем инициатора вызова о получении уведомления
                            if (socketRef.current) {
                                socketRef.current.emit(SocketActions.CHANGE_CALL_STATUS, {
                                    status: CallStatus.WAIT,
                                    userTo: chatInfo.initiatorId
                                });
                            }
                        }
                    });

                    // Установка нового статуса для звонка
                    socketRef.current.on(SocketActions.SET_CALL_STATUS, ({ status }) => {
                        if (status) {
                            dispatch(setStatus(status));
                        }
                    });

                    // Уведомляем пользователя, что на другой вкладке звонок
                    socketRef.current.on(SocketActions.ALREADY_IN_CALL, ({ roomId, chatInfo, users }) => {
                        if (roomId && chatInfo && users && users.length) {
                            dispatch(setGlobalInCall({ roomId, chatInfo, users }));
                        }
                    });

                    // Обработка системного канала с ошибками
                    socketRef.current.on(SocketActions.SOCKET_CHANNEL_ERROR, ({ message, type }) => {
                        switch (type) {
                            case SocketChannelErrorTypes.CALLS:
                                // Вывод ошибки
                                dispatch(setSystemError(message));
                                // Обнуление состояния звонка
                                resetCallStore(dispatch);
                                break;
                            default:
                                catchErrors.catch(
                                    "Неизвестный тип системной ошибки по каналу сокета: " + type,
                                    router,
                                    dispatch
                                );
                                break;
                        }
                    });

                    // Установка нового статуса для звонка
                    socketRef.current.on(SocketActions.CANCEL_CALL, () => {
                        // Обнуление состояния звонка
                        resetCallStore(dispatch);
                    });

                    // Звонок был завершен, и если текущая вкладка - не вкладка со звонком, 
                    // то мы закрываем плашку с информацией о звонке
                    socketRef.current.on(SocketActions.NOT_ALREADY_IN_CALL, () => {
                        dispatch(setGlobalInCall(null));
                    });
                }
            });

            // Событие возникает при невозможности установить соединение или соединение было отклонено сервером (к примеру мидлваром)
            socketRef.current.on("connect_error", () => {
                if (socketRef.current) {
                    // Обнлвляем авторизацию юзера
                    socketRef.current.auth = { user };
                    socketRef.current.connect();
                }
            });

            socketRef.current.on("disconnect", (reason) => {
                // Если сокет отключился по инициативе сервера
                if (reason === "io server disconnect") {
                    if (socketRef.current) socketRef.current.connect();
                }

                // Иначе сокет попытается самостоятельно переподключиться
            });
        }

        // Отключаем сокет-соединение
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        }
    }, []);

    return <SocketIOClient.Provider value={socketRef.current}>
        {children}
    </SocketIOClient.Provider>
};