use crate::types::{
    AbstractStyle, CommentDef, DefaultStyles, ElementStyle, HeaderFooterStyle, PageStyle,
    ReplyDef, StyleProperty, StyleSheet,
};

enum BlockKind {
    Page,
    Header,
    Footer,
    Defaults,
    Abstract(String),
    Comment(String),
    Element(String),
    Invalid(String),
}

struct RawBlock {
    name: String,
    properties: Vec<(String, String)>,
}

pub fn parse_styles(raw: &str) -> (StyleSheet, Vec<String>) {
    let (blocks, mut errors) = tokenize_blocks(raw);
    let mut stylesheet = StyleSheet::default();

    for block in blocks {
        match categorize_block(&block.name) {
            BlockKind::Page => stylesheet.page = Some(parse_page_style(&block.properties)),
            BlockKind::Header => {
                stylesheet.header = Some(parse_header_footer(&block.properties))
            }
            BlockKind::Footer => {
                stylesheet.footer = Some(parse_header_footer(&block.properties))
            }
            BlockKind::Defaults => {
                stylesheet.defaults = Some(parse_defaults(&block.properties))
            }
            BlockKind::Abstract(name) => {
                stylesheet.abstracts.push(parse_abstract(&name, &block.properties))
            }
            BlockKind::Comment(id) => {
                stylesheet.comments.push(parse_comment(&id, &block.properties))
            }
            BlockKind::Element(id) => {
                stylesheet.elements.push(parse_element(&id, &block.properties))
            }
            BlockKind::Invalid(msg) => errors.push(msg),
        }
    }

    resolve_inheritance(&mut stylesheet);
    (stylesheet, errors)
}

fn tokenize_blocks(raw: &str) -> (Vec<RawBlock>, Vec<String>) {
    let mut blocks: Vec<RawBlock> = Vec::new();
    let mut errors: Vec<String> = Vec::new();
    let mut chars = raw.chars().peekable();
    let mut pos = 0;

    // Simple state machine: scan for '@', read name until '{', read properties until '}'
    while let Some(&ch) = chars.peek() {
        if ch == '@' {
            chars.next();
            pos += 1;

            // Read name until '{'
            let mut name = String::new();
            let mut found_brace = false;
            while let Some(&c) = chars.peek() {
                if c == '{' {
                    chars.next();
                    pos += 1;
                    found_brace = true;
                    break;
                }
                name.push(c);
                chars.next();
                pos += 1;
            }

            if !found_brace {
                errors.push(format!("Malformed block @{}: missing opening brace", name.trim()));
                continue;
            }

            let name = name.trim().to_string();

            // Read properties until matching '}', respecting quoted strings
            let mut body = String::new();
            let mut found_close = false;
            let mut in_quote = false;
            let mut quote_char = '"';
            while let Some(&c) = chars.peek() {
                if in_quote {
                    body.push(c);
                    chars.next();
                    pos += 1;
                    if c == quote_char {
                        in_quote = false;
                    }
                } else if c == '"' || c == '\'' {
                    in_quote = true;
                    quote_char = c;
                    body.push(c);
                    chars.next();
                    pos += 1;
                } else if c == '}' {
                    chars.next();
                    pos += 1;
                    found_close = true;
                    break;
                } else {
                    body.push(c);
                    chars.next();
                    pos += 1;
                }
            }

            if !found_close {
                errors.push(format!("Malformed block @{}: missing closing brace", name));
                continue;
            }

            let properties = parse_properties(&body);
            blocks.push(RawBlock { name, properties });
        } else {
            chars.next();
            pos += 1;
        }
    }

    (blocks, errors)
}

fn parse_properties(body: &str) -> Vec<(String, String)> {
    let mut props = Vec::new();
    for part in body.split(';') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        // For reply properties the key contains a colon (e.g. "reply:r1.author"),
        // so we need to find the value-separator colon — the one after the key.
        // Strategy: if the part starts with "reply:", find the next colon after that prefix.
        let colon_pos = if part.starts_with("reply:") {
            // key is "reply:id.field", separator colon follows the dot-field portion
            part["reply:".len()..].find(':').map(|p| "reply:".len() + p)
        } else {
            part.find(':')
        };

        if let Some(colon_pos) = colon_pos {
            let key = part[..colon_pos].trim().to_string();
            let value = part[colon_pos + 1..].trim().to_string();
            if !key.is_empty() && !value.is_empty() {
                props.push((key, value));
            }
        }
    }
    props
}

fn categorize_block(name: &str) -> BlockKind {
    match name {
        "page" => BlockKind::Page,
        "header" => BlockKind::Header,
        "footer" => BlockKind::Footer,
        "defaults" => BlockKind::Defaults,
        _ if name.starts_with('.') => {
            let abstract_name = name[1..].to_string();
            if abstract_name.is_empty() {
                BlockKind::Invalid("Abstract block with empty name".to_string())
            } else {
                BlockKind::Abstract(abstract_name)
            }
        }
        _ if name.starts_with("comment:") => {
            let id = name["comment:".len()..].to_string();
            if id.is_empty() {
                BlockKind::Invalid("Comment block with empty id".to_string())
            } else {
                BlockKind::Comment(id)
            }
        }
        _ => BlockKind::Element(name.to_string()),
    }
}

fn parse_page_style(props: &[(String, String)]) -> PageStyle {
    let mut style = PageStyle {
        size: None,
        orientation: None,
        margin: None,
        margin_top: None,
        margin_bottom: None,
        margin_left: None,
        margin_right: None,
        columns: None,
        column_gap: None,
    };
    for (key, value) in props {
        match key.as_str() {
            "size" => style.size = Some(value.clone()),
            "orientation" => style.orientation = Some(value.clone()),
            "margin" => style.margin = Some(value.clone()),
            "margin-top" => style.margin_top = Some(value.clone()),
            "margin-bottom" => style.margin_bottom = Some(value.clone()),
            "margin-left" => style.margin_left = Some(value.clone()),
            "margin-right" => style.margin_right = Some(value.clone()),
            "columns" => style.columns = value.parse().ok(),
            "column-gap" => style.column_gap = Some(value.clone()),
            _ => {} // silently ignore unknown
        }
    }
    style
}

fn parse_header_footer(props: &[(String, String)]) -> HeaderFooterStyle {
    let mut style = HeaderFooterStyle {
        content: None,
        font_size: None,
        color: None,
        align: None,
        border_bottom: None,
        border_top: None,
    };
    for (key, value) in props {
        let value = strip_quotes(value);
        match key.as_str() {
            "content" => style.content = Some(value),
            "font-size" => style.font_size = Some(value),
            "color" => style.color = Some(value),
            "align" => style.align = Some(value),
            "border-bottom" => style.border_bottom = Some(value),
            "border-top" => style.border_top = Some(value),
            _ => {}
        }
    }
    style
}

fn parse_defaults(props: &[(String, String)]) -> DefaultStyles {
    DefaultStyles {
        properties: props
            .iter()
            .map(|(k, v)| StyleProperty {
                key: k.clone(),
                value: strip_quotes(v),
            })
            .collect(),
    }
}

fn parse_abstract(name: &str, props: &[(String, String)]) -> AbstractStyle {
    AbstractStyle {
        name: name.to_string(),
        properties: props
            .iter()
            .map(|(k, v)| StyleProperty {
                key: k.clone(),
                value: strip_quotes(v),
            })
            .collect(),
    }
}

fn parse_comment(id: &str, props: &[(String, String)]) -> CommentDef {
    let mut comment = CommentDef {
        id: id.to_string(),
        author: None,
        date: None,
        text: None,
        resolved: false,
        edited_at: None,
        replies: Vec::new(),
    };

    let mut reply_map: std::collections::BTreeMap<String, ReplyDef> =
        std::collections::BTreeMap::new();

    for (key, value) in props {
        let value = strip_quotes(value);
        if let Some(rest) = key.strip_prefix("reply:") {
            if let Some((reply_id, field)) = rest.split_once('.') {
                let entry = reply_map
                    .entry(reply_id.to_string())
                    .or_insert_with(|| ReplyDef {
                        id: reply_id.to_string(),
                        author: None,
                        date: None,
                        text: None,
                    });
                match field {
                    "author" => entry.author = Some(value),
                    "date" => entry.date = Some(value),
                    "text" => entry.text = Some(value),
                    _ => {}
                }
            }
        } else {
            match key.as_str() {
                "author" => comment.author = Some(value),
                "date" => comment.date = Some(value),
                "text" => comment.text = Some(value),
                "resolved" => comment.resolved = value == "true",
                "edited-at" => comment.edited_at = Some(value),
                _ => {}
            }
        }
    }

    comment.replies = reply_map.into_values().collect();
    comment
}

fn parse_element(id: &str, props: &[(String, String)]) -> ElementStyle {
    let mut inherit = None;
    let mut properties = Vec::new();

    for (key, value) in props {
        if key == "inherit" {
            inherit = Some(strip_quotes(value));
        } else {
            properties.push(StyleProperty {
                key: key.clone(),
                value: strip_quotes(value),
            });
        }
    }

    ElementStyle {
        id: id.to_string(),
        inherit,
        properties,
    }
}

fn resolve_inheritance(stylesheet: &mut StyleSheet) {
    // Collect abstract blocks into a lookup
    let abstracts: std::collections::HashMap<String, Vec<StyleProperty>> = stylesheet
        .abstracts
        .iter()
        .map(|a| (format!(".{}", a.name), a.properties.clone()))
        .collect();

    for element in &mut stylesheet.elements {
        if let Some(ref inherit_name) = element.inherit {
            if let Some(base_props) = abstracts.get(inherit_name) {
                // Prepend base properties (element's own properties override)
                let existing_keys: std::collections::HashSet<String> =
                    element.properties.iter().map(|p| p.key.clone()).collect();
                let mut merged = Vec::new();
                for prop in base_props {
                    if !existing_keys.contains(&prop.key) {
                        merged.push(prop.clone());
                    }
                }
                merged.extend(element.properties.drain(..));
                element.properties = merged;
            }
        }
    }
}

fn strip_quotes(s: &str) -> String {
    let s = s.trim();
    if (s.starts_with('"') && s.ends_with('"')) || (s.starts_with('\'') && s.ends_with('\'')) {
        s[1..s.len() - 1].to_string()
    } else {
        s.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_page_block() {
        let input = r#"@page {
  size: letter;
  margin: 1in;
}"#;
        let (ss, errors) = parse_styles(input);
        assert!(errors.is_empty());
        let page = ss.page.unwrap();
        assert_eq!(page.size.as_deref(), Some("letter"));
        assert_eq!(page.margin.as_deref(), Some("1in"));
    }

    #[test]
    fn parse_header_footer() {
        let input = r#"
@header {
  content: "Report — Confidential";
  font-size: 8pt;
  align: right;
}
@footer {
  content: "Page {{page}} of {{pages}}";
  align: center;
}"#;
        let (ss, errors) = parse_styles(input);
        assert!(errors.is_empty());
        let header = ss.header.unwrap();
        assert_eq!(header.content.as_deref(), Some("Report — Confidential"));
        assert_eq!(header.align.as_deref(), Some("right"));
        let footer = ss.footer.unwrap();
        assert!(footer.content.as_deref().unwrap().contains("{{page}}"));
    }

    #[test]
    fn parse_abstract_and_inherit() {
        let input = r#"
@.heading-base {
  font-family: "Inter";
  font-weight: 700;
  color: #1a1a1a;
}
@title {
  inherit: .heading-base;
  font-size: 32pt;
  color: #0a0a0a;
}"#;
        let (ss, errors) = parse_styles(input);
        assert!(errors.is_empty());
        assert_eq!(ss.abstracts.len(), 1);
        assert_eq!(ss.abstracts[0].name, "heading-base");

        let title = &ss.elements[0];
        assert_eq!(title.id, "title");
        // After inheritance: should have font-family and font-weight from base,
        // plus font-size and color (overridden) from element
        let keys: Vec<&str> = title.properties.iter().map(|p| p.key.as_str()).collect();
        assert!(keys.contains(&"font-family"));
        assert!(keys.contains(&"font-weight"));
        assert!(keys.contains(&"font-size"));
        assert!(keys.contains(&"color"));
        // color should be the overridden value
        let color = title.properties.iter().find(|p| p.key == "color").unwrap();
        assert_eq!(color.value, "#0a0a0a");
    }

    #[test]
    fn parse_comment_block() {
        let input = r#"
@comment:c1 {
  author: "Igor";
  date: "2026-03-29";
  text: "Break this down by sub-segment.";
  resolved: false;
}"#;
        let (ss, errors) = parse_styles(input);
        assert!(errors.is_empty());
        assert_eq!(ss.comments.len(), 1);
        let c = &ss.comments[0];
        assert_eq!(c.id, "c1");
        assert_eq!(c.author.as_deref(), Some("Igor"));
        assert!(!c.resolved);
    }

    #[test]
    fn parse_comment_with_replies() {
        let input = r#"
@comment:c1 {
  author: "Eyal";
  text: "Fix this";
  date: "2026-04-05";
  reply:r1.author: "Nadya";
  reply:r1.text: "Done";
  reply:r1.date: "2026-04-06";
  reply:r2.author: "Igor";
  reply:r2.text: "Confirmed";
}"#;
        let (ss, errors) = parse_styles(input);
        assert!(errors.is_empty());
        assert_eq!(ss.comments.len(), 1);
        let c = &ss.comments[0];
        assert_eq!(c.id, "c1");
        assert_eq!(c.author.as_deref(), Some("Eyal"));
        assert_eq!(c.text.as_deref(), Some("Fix this"));
        assert_eq!(c.date.as_deref(), Some("2026-04-05"));
        assert_eq!(c.replies.len(), 2);

        // BTreeMap preserves insertion order by key, so r1 comes before r2
        let r1 = c.replies.iter().find(|r| r.id == "r1").expect("r1 not found");
        assert_eq!(r1.author.as_deref(), Some("Nadya"));
        assert_eq!(r1.text.as_deref(), Some("Done"));
        assert_eq!(r1.date.as_deref(), Some("2026-04-06"));

        let r2 = c.replies.iter().find(|r| r.id == "r2").expect("r2 not found");
        assert_eq!(r2.author.as_deref(), Some("Igor"));
        assert_eq!(r2.text.as_deref(), Some("Confirmed"));
        assert_eq!(r2.date, None);
    }

    #[test]
    fn parse_defaults_block() {
        let input = r#"
@defaults {
  font-family: "Inter";
  font-size: 11pt;
  color: #1a1a1a;
}"#;
        let (ss, errors) = parse_styles(input);
        assert!(errors.is_empty());
        let defaults = ss.defaults.unwrap();
        assert_eq!(defaults.properties.len(), 3);
    }

    #[test]
    fn malformed_block_missing_brace() {
        let input = "@broken { font-size: 12pt";
        let (_, errors) = parse_styles(input);
        assert!(!errors.is_empty());
    }

    #[test]
    fn parse_element_block() {
        let input = r#"
@highlight {
  color: #0066cc;
  font-weight: 700;
  background: #e6f0ff;
}"#;
        let (ss, errors) = parse_styles(input);
        assert!(errors.is_empty());
        assert_eq!(ss.elements.len(), 1);
        assert_eq!(ss.elements[0].id, "highlight");
        assert_eq!(ss.elements[0].properties.len(), 3);
    }

    #[test]
    fn parse_full_report_styles() {
        let input = std::fs::read_to_string("../../examples/report.mdxx").unwrap();
        let sections = crate::splitter::split_sections(&input);
        let styling = sections.styling.unwrap();
        let (ss, errors) = parse_styles(&styling);
        assert!(errors.is_empty(), "Errors: {:?}", errors);
        assert!(ss.page.is_some());
        assert!(ss.header.is_some());
        assert!(ss.footer.is_some());
        assert!(ss.defaults.is_some());
        assert!(!ss.abstracts.is_empty());
        assert!(!ss.elements.is_empty());
        assert!(!ss.comments.is_empty());
        // Verify inheritance resolved for @title
        let title = ss.elements.iter().find(|e| e.id == "title").unwrap();
        let keys: Vec<&str> = title.properties.iter().map(|p| p.key.as_str()).collect();
        assert!(keys.contains(&"font-family"), "title should inherit font-family");
    }
}
