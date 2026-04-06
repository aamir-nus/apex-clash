import { getBootstrapContent } from "../services/contentService.js";

export function getContentBootstrap(_request, response) {
  response.json({
    ok: true,
    data: getBootstrapContent()
  });
}
