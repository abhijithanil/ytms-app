package com.insp17.ytms.dtos;

public class CreateChannelRequest {
    private String name;
    private String description;
    private String type; // Will be converted to enum
    private boolean isPrivate;

    // Constructors
    public CreateChannelRequest() {}

    public CreateChannelRequest(String name, String description, String type, boolean isPrivate) {
        this.name = name;
        this.description = description;
        this.type = type;
        this.isPrivate = isPrivate;
    }

    // Getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public boolean isPrivate() { return isPrivate; }
    public void setPrivate(boolean isPrivate) { this.isPrivate = isPrivate; }
}