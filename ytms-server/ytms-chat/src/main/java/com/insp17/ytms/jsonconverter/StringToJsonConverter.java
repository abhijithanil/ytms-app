package com.insp17.ytms.jsonconverter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Converter(autoApply = false) // Set to true if you want to apply it to all String fields mapped to JSON columns
public class StringToJsonConverter implements AttributeConverter<String, Object> {

    private static final Logger logger = LoggerFactory.getLogger(StringToJsonConverter.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Object convertToDatabaseColumn(String attribute) {
        // From your Java String to the DB
        if (attribute == null) {
            return null;
        }
        // This method simply returns the string, but the key is that
        // the JDBC driver will receive it as an object to be treated as JSON.
        // For more complex objects (like a Map), you'd serialize here.
        return attribute;
    }

    @Override
    public String convertToEntityAttribute(Object dbData) {
        // From the DB to your Java String
        if (dbData == null) {
            return null;
        }
        try {
            // Convert the object (which might be a PGobject) to a JSON string
            return objectMapper.writeValueAsString(dbData);
        } catch (JsonProcessingException e) {
            logger.error("Failed to convert JSON object to string", e);
            // Fallback to a simple toString() if serialization fails
            return dbData.toString();
        }
    }
}