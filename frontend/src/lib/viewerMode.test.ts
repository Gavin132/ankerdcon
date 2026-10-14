import { describe, expect, it } from "vitest";
import { viewerMayRequest } from "./viewerMode";

describe("viewerMayRequest", () => {
  it("lets a viewer read", () => {
    expect(viewerMayRequest("GET", "/api/rides/")).toBe(true);
    expect(viewerMayRequest("get", "/api/meals/?x=1")).toBe(true);
  });

  it("lets a viewer change their own account and mark a story as seen", () => {
    expect(viewerMayRequest("PUT", "/api/users/preferences")).toBe(true);
    expect(viewerMayRequest("post", "/api/users/me/test-notification")).toBe(true);
    expect(viewerMayRequest("DELETE", "/api/push/subscribe")).toBe(true);
    expect(viewerMayRequest("POST", "/api/feedback/")).toBe(true);
    expect(viewerMayRequest("PUT", "/api/stories/abc-123/seen")).toBe(true);
  });

  it("does not let a viewer sign up for or change anything else", () => {
    expect(viewerMayRequest("POST", "/api/rides/")).toBe(false);
    expect(viewerMayRequest("POST", "/api/meals/abc/rsvp")).toBe(false);
    expect(viewerMayRequest("POST", "/api/expenses/")).toBe(false);
    expect(viewerMayRequest("POST", "/api/stories/abc-123")).toBe(false);
    expect(viewerMayRequest("PUT", "/api/users/abc/location")).toBe(false);
    expect(viewerMayRequest("DELETE", "/api/meals/abc")).toBe(false);
  });

  it("reads the path out of an absolute URL, with a query", () => {
    expect(viewerMayRequest("PUT", "https://dev.example.org/api/users/preferences?x=1")).toBe(true);
    expect(viewerMayRequest("POST", "https://dev.example.org/api/rides/?x=1")).toBe(false);
  });
});
