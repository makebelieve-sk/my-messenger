import React from "react";
import { useRouter } from "next/router";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { ApiRoutes, Pages } from "../../types/enums";
import { IUser } from "../../types/models.types";
import { useAppDispatch, useAppSelector } from "../../hooks/useGlobalState";
import SocketIOProvider from "../socket-io-provider";
import Header from "../header";
import MenuComponent from "../menu";
import SnackBarWithCall from "../snackbar-with-call";
import ModalWithError from "../modal-with-error";
import ModalWithCall from "../modal-with-call";
import ModalWithImagesCarousel from "../modal-with-images-carousel";
import ModalWithConfirm from "../modal-with-confirm";
import { selectMainState, setGlobalUserLoading } from "../../state/main/slice";
import { selectErrorState } from "../../state/error/slice";
import { selectUserState, setUser } from "../../state/user/slice";
import Request from "../../core/request";
import CatchErrors from "../../core/catch-errors";

import styles from "./app.module.scss";

export default function App({ Component, pageProps }) {
    const [openSnack, setOpenSnack] = React.useState(false);

    const { globalUserLoading } = useAppSelector(selectMainState);
    const { systemError } = useAppSelector(selectErrorState);
    const { user } = useAppSelector(selectUserState);

    const dispatch = useAppDispatch();
    const router = useRouter();

    // Открытие уведомления с ошибкой, переданной по сокету
    React.useEffect(() => {
        setOpenSnack(Boolean(systemError));
    }, [systemError]);

    // Закрытие окна с системной ошибкой
    const onCloseSnack = () => {
        setOpenSnack(false);
    };

    const component = <>
        <Snackbar open={openSnack} onClose={onCloseSnack}>
            <Alert onClose={onCloseSnack} severity="error">
                {systemError}
            </Alert>
        </Snackbar>

        <SnackBarWithCall />

        <ModalWithError />
        <ModalWithCall />
        <ModalWithImagesCarousel />
        <ModalWithConfirm />

        <Component {...pageProps} />
    </>;

    // Получаем пользователя единственный раз
    React.useEffect(() => {
        Request.get(ApiRoutes.getUser, (loading: boolean) => dispatch(setGlobalUserLoading(loading)),
            (data: { success: boolean, user: IUser }) => {
                const user = data.user;

                if (user) {
                    dispatch(setUser(user));
                }
            }, (error: any) => CatchErrors.catch(error, router, dispatch));
    }, []);

    return router.pathname !== Pages.signIn && router.pathname !== Pages.signUp && user
        ? <SocketIOProvider user={user}>
            <div className={styles["main__container"]}>
                <Header />

                <div className={styles["main__container__body"]}>
                    <MenuComponent />

                    <div className={styles["main__container__body_content"]}>
                        {globalUserLoading
                            ? <CircularProgress />
                            : component
                        }
                    </div>
                </div>
            </div>
        </SocketIOProvider>
        : component
};