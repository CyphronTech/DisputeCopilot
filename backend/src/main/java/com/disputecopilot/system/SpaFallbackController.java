package com.disputecopilot.system;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Lets the React Router SPA own client-side routes like /cases/{id} — a browser refresh (or
 * direct link) on one of those hits this server, which forwards it to index.html instead of
 * 404ing. Only active when the frontend build is bundled into the jar (see pom.xml's
 * package-app profile); a normal dev run with the Vite dev server never reaches this.
 * Exact @RequestMapping matches (like /api/v1/...) always win over this pattern, per Spring's
 * mapping specificity rules, so it never shadows a real endpoint.
 */
@Controller
class SpaFallbackController {

  @RequestMapping({"/{path:[^.]*}", "/**/{path:[^.]*}"})
  String forward() {
    return "forward:/index.html";
  }
}
