import React from "react";
import { GetServerSideProps } from "next";
import { COOKIE_NAME } from "../common";
import { Pages } from "../types/enums";

export default function () {
    return <></>;
};

export const getServerSideProps: GetServerSideProps = async function(context) {
    const cookie = context.req.cookies[COOKIE_NAME];
  
    return Boolean(cookie)
        ? { props: {}, redirect: { destination: Pages.profile, permanent: false } }
        : { props: {}, redirect: { destination: Pages.signIn, permanent: false } };
};