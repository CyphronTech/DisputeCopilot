package com.disputecopilot.connector;

import java.util.List;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Stand-in for the schema-discovery wizard's saved allowlist (see docs/architecture.md,
 * "Schema discovery and the bounded read tool"). Once the wizard exists, this becomes
 * rows read from table_allowlist_entry instead of application.yml.
 */
@ConfigurationProperties(prefix = "connector")
public record ConnectorAllowlistProperties(Map<String, List<String>> allowlist) {}
