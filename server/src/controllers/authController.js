export function createGuestSession(_request, response) {
  response.status(201).json({
    ok: true,
    data: {
      userId: "guest-profile",
      mode: "guest"
    }
  });
}
