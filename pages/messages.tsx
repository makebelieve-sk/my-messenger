import React from "react";
import { useRouter } from "next/router";
import { Avatar, CircularProgress, List, ListItem, ListItemAvatar, ListItemText, Paper, Stack, TextField } from "@mui/material";
import CatchErrors from "../core/catch-errors";
import { ApiRoutes, Pages, Times } from "../types/enums";
import { selectUserState } from "../state/user/slice";
import { useAppDispatch, useAppSelector } from "../hooks/useGlobalState";
import { selectMessagesState, setDialogs } from "../state/messages/slice";
import Request from "../core/request";
import { getHoursOrMinutes, getMonthName, isSingleChat, NO_PHOTO } from "../common";
import { IUser } from "../types/models.types";
import { skeletonsPossibleFriends } from "./friends";

import styles from "../styles/pages/messages.module.scss";

type UserExt = Pick<IUser, "id" | "firstName" | "thirdName" | "avatarUrl">;

export interface IDialog {
    id: string;
    message: string;
    createDate: string;
    userFrom: UserExt;
    userTo?: UserExt;
    name?: string;
};

// TODO
// Реализовать скролл диалогов, их подгрузку при скролле, поиск диалогов

export default function Messages() {
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(0);
    const [isMore, setIsMore] = React.useState(false);

    const { user } = useAppSelector(selectUserState);
    const { dialogs } = useAppSelector(selectMessagesState);
    const router = useRouter();
    const dispatch = useAppDispatch();

    React.useEffect(() => {
        if (user && (dialogs && !dialogs.length || !dialogs)) {
            Request.post(ApiRoutes.getDialogs, { userId: user.id, page }, setLoading,
                (data: { success: boolean, dialogs: IDialog[]; isMore: boolean; }) => {
                    dispatch(setDialogs(data.dialogs));
                    setIsMore(data.isMore);
                },
                (error) => CatchErrors.catch(error, router, dispatch)
            );
        }
    }, [user]);

    return <Paper className={styles["messages-container"]}>
        <TextField
            id="standard-input"
            label="Поиск"
            variant="standard"
            fullWidth
            className={styles["messages-container--search-field"]}
            size="small"
        />

        {loading
            ? <Stack spacing={1} className={styles["skeleton-container"]}>
                {skeletonsPossibleFriends.map((skeleton, index) => {
                    return <div 
                        key={"messages-container " + index} 
                        className={styles["skeleton-container__row"] + " " + styles["messages-container__skeleton-container"]}
                    >
                        {skeleton}
                    </div>
                })}
            </Stack>
            : dialogs && dialogs.length
                ? <List className={styles["messages-container__list"]}>
                    {isMore
                        ? <div id="loading-dialogs-is-more" className={styles["messages-container__list__is-more"]}>
                            <CircularProgress />
                        </div>
                        : null
                    }

                    {dialogs.map(dialog => {
                        const friendName = dialog.userFrom.firstName + " " + dialog.userFrom.thirdName;
                        const chatName = isSingleChat(dialog.id)
                            ? user && user.id === dialog.userFrom.id && dialog.userTo
                                ? dialog.userTo.firstName + " " + dialog.userTo.thirdName
                                : friendName
                            : dialog.name;

                        const chatAvatar = isSingleChat(dialog.id)
                            ? user && user.id === dialog.userFrom.id && dialog.userTo
                                ? dialog.userTo.avatarUrl
                                : dialog.userFrom.avatarUrl
                                    ? dialog.userFrom.avatarUrl
                                    : NO_PHOTO
                            : "несколько аватарок участников (как в вк 4 штуки)";

                        const currentDate = Date.now() - Date.parse(dialog.createDate) > Times.YEAR_OR_OLDER
                            ? new Date(dialog.createDate).getDate() + getMonthName(new Date(dialog.createDate).getMonth()) + " " + new Date(dialog.createDate).getFullYear()
                            : Date.now() - Date.parse(dialog.createDate) > Times.YESTERDAY && Date.now() - Date.parse(dialog.createDate) < Times.HALF_YEAR
                                ? new Date(dialog.createDate).getDate() + getMonthName(new Date(dialog.createDate).getMonth())
                                : Date.now() - Date.parse(dialog.createDate) > Times.TODAY && Date.now() - Date.parse(dialog.createDate) < Times.YESTERDAY
                                    ? "вчера " + getHoursOrMinutes(new Date(dialog.createDate).getHours()) + ":" + getHoursOrMinutes(new Date(dialog.createDate).getMinutes())
                                    : Date.now() - Date.parse(dialog.createDate) < Times.TODAY
                                        ? getHoursOrMinutes(new Date(dialog.createDate).getHours()) + ":" + getHoursOrMinutes(new Date(dialog.createDate).getMinutes())
                                        : null;

                        // Переход на страницу диалога
                        const goToMessagesArea = () => {
                            // Если чат - одиночный
                            if (isSingleChat(dialog.id) && dialog.userTo) {
                                const query = user && user.id === dialog.userFrom.id
                                    ? { friendId: dialog.userTo.id, friendName: dialog.userTo.firstName + " " + dialog.userTo.thirdName, friendAvatarUrl: dialog.userTo.avatarUrl }
                                    : { friendId: dialog.userFrom.id, friendName, friendAvatarUrl: dialog.userFrom.avatarUrl };

                                router.push({ pathname: Pages.messages + "/" + dialog.id, query }, Pages.messages + "/" + dialog.id);
                            } else {
                                // Если чат - групповой
                                console.log("--Чат - групповой--")
                            }
                        };

                        return <ListItem className={styles["messages-container__item"]} key={dialog.id}>
                            <ListItemAvatar>
                                <Avatar alt={chatName} src={chatAvatar} className={styles["messages-container__item__avatar"]} />
                            </ListItemAvatar>

                            <ListItemText
                                className={styles["messages-container__item__dialog-name"]}
                                primary={chatName}
                                disableTypography
                                secondary={
                                    <div className={styles["messages-container__item__secondary"]}>
                                        {user && user.id === dialog.userFrom.id && dialog.userTo
                                            ? <Avatar
                                                alt={chatName}
                                                src={dialog.userFrom.avatarUrl ? dialog.userFrom.avatarUrl : NO_PHOTO}
                                                className={styles["messages-container__item__author-avatar"]}
                                                sx={{ width: 25, height: 25 }}
                                            />
                                            : null
                                        }
                                        {dialog.message && dialog.message.length > 65 ? dialog.message.slice(0, 65) + "..." : dialog.message}
                                    </div>
                                }
                                onClick={goToMessagesArea}
                            />

                            <div className={styles["messages-container__item__dialog-date"]} onClick={goToMessagesArea}>{currentDate}</div>
                        </ListItem>
                    })}
                </List>
                : <div className={styles["messages-container__no-dialogs"] + " opacity-text"}>
                    У Вас пока нет диалогов. Напишите кому-нибудь!
                </div>
        }
    </Paper>
};