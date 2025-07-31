package com.insp17.ytms.gson;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class ToJsonStringAspect {

    @Around("execution(* com.insp17.ytms..*.toString()) && @target(toJsonString)")
    public Object aroundToString(ProceedingJoinPoint joinPoint, ToJsonString toJsonString) throws Throwable {
        Object target = joinPoint.getTarget();
        System.out.println("AOP intercepted toString() for: " + target.getClass().getName());
        String result = GsonUtil.toJsonString(target);
        System.out.println("JSON result: " + result);
        return result;
    }
}