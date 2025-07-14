package com.insp17.ytms.gson;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

public class GsonUtil {

    private static final Gson DEFAULT_GSON = new GsonBuilder()
            .setDateFormat("yyyy-MM-dd HH:mm:ss")
            .setPrettyPrinting()
            .serializeNulls()
            .create();

    public static String toJsonString(Object obj) {
        if (obj == null) {
            return "null";
        }
        return DEFAULT_GSON.toJson(obj);
    }

    public static <T> T fromJsonString(String json, Class<T> clazz) {
        return DEFAULT_GSON.fromJson(json, clazz);
    }
}