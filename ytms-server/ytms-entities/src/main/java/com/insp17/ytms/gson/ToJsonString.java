package com.insp17.ytms.gson;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface ToJsonString {

    String dateFormat() default "yyyy-MM-dd HH:mm:ss";

    boolean includeNulls() default false;

    boolean prettyPrint() default false;
}