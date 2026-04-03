use crate::types::{
    ContentNode, InlineNode, ListItem, MdxxDocument, StyleProperty, StyleSheet,
};

pub fn render_html(document: &MdxxDocument) -> String {
    let mut html = String::new();

    html.push_str(&render_page_wrapper(&document.styles));

    for node in &document.content {
        html.push_str(&render_node(node, &document.styles));
    }

    html.push_str("</div>"); // close page wrapper
    html
}

fn render_page_wrapper(styles: &StyleSheet) -> String {
    let mut css_parts = Vec::new();
    if let Some(ref page) = styles.page {
        if let Some(ref margin) = page.margin {
            css_parts.push(format!("padding: {}", margin));
        }
        if let Some(ref margin_top) = page.margin_top {
            css_parts.push(format!("padding-top: {}", margin_top));
        }
        if let Some(ref margin_bottom) = page.margin_bottom {
            css_parts.push(format!("padding-bottom: {}", margin_bottom));
        }
        if let Some(ref margin_left) = page.margin_left {
            css_parts.push(format!("padding-left: {}", margin_left));
        }
        if let Some(ref margin_right) = page.margin_right {
            css_parts.push(format!("padding-right: {}", margin_right));
        }
        if let Some(columns) = page.columns {
            if columns > 1 {
                css_parts.push(format!("column-count: {}", columns));
                if let Some(ref gap) = page.column_gap {
                    css_parts.push(format!("column-gap: {}", gap));
                }
            }
        }
    }
    let style = if css_parts.is_empty() {
        String::new()
    } else {
        format!(r#" style="{}""#, css_parts.join("; "))
    };
    format!(r#"<div class="mdxx-document"{}>"#, style)
}

fn render_node(node: &ContentNode, styles: &StyleSheet) -> String {
    match node {
        ContentNode::Heading {
            level,
            id,
            children,
            ..
        } => {
            let style_attr = id
                .as_ref()
                .and_then(|id| resolve_style(id, styles))
                .map(|s| format!(r#" style="{}""#, s))
                .unwrap_or_default();
            let data_id = id
                .as_ref()
                .map(|id| format!(r#" data-mdxx-id="{}""#, id))
                .unwrap_or_default();
            format!(
                "<h{lvl}{style}{data}>{content}</h{lvl}>\n",
                lvl = level,
                style = style_attr,
                data = data_id,
                content = render_inlines(children, styles)
            )
        }
        ContentNode::Paragraph {
            id, children, ..
        } => {
            let style_attr = id
                .as_ref()
                .and_then(|id| resolve_style(id, styles))
                .map(|s| format!(r#" style="{}""#, s))
                .unwrap_or_default();
            let data_id = id
                .as_ref()
                .map(|id| format!(r#" data-mdxx-id="{}""#, id))
                .unwrap_or_default();
            format!(
                "<p{style}{data}>{content}</p>\n",
                style = style_attr,
                data = data_id,
                content = render_inlines(children, styles)
            )
        }
        ContentNode::Image { alt, src, id } => {
            let img_style = id
                .as_ref()
                .and_then(|id| resolve_image_style(id, styles))
                .unwrap_or_default();
            let data_id = id
                .as_ref()
                .map(|id| format!(r#" data-mdxx-id="{}""#, id))
                .unwrap_or_default();

            let caption = id
                .as_ref()
                .and_then(|id| get_property(id, "caption", styles));

            let caption_style = id.as_ref().map(|id| {
                let mut parts = Vec::new();
                if let Some(v) = get_property(id, "caption-font-size", styles) {
                    parts.push(format!("font-size: {}", v));
                }
                if let Some(v) = get_property(id, "caption-color", styles) {
                    parts.push(format!("color: {}", v));
                }
                parts.join("; ")
            }).unwrap_or_default();

            let figure_style = id
                .as_ref()
                .and_then(|id| resolve_figure_style(id, styles))
                .unwrap_or_default();

            if caption.is_some() {
                let fig_style = if figure_style.is_empty() {
                    String::new()
                } else {
                    format!(r#" style="{}""#, figure_style)
                };
                let cap_style = if caption_style.is_empty() {
                    String::new()
                } else {
                    format!(r#" style="{}""#, caption_style)
                };
                format!(
                    "<figure{fig_style}{data}><img src=\"{src}\" alt=\"{alt}\"{img_style} /><figcaption{cap_style}>{caption}</figcaption></figure>\n",
                    fig_style = fig_style,
                    data = data_id,
                    src = src,
                    alt = alt,
                    img_style = img_style,
                    cap_style = cap_style,
                    caption = caption.unwrap(),
                )
            } else {
                format!(
                    "<img src=\"{src}\" alt=\"{alt}\"{img_style}{data} />\n",
                    src = src,
                    alt = alt,
                    img_style = img_style,
                    data = data_id,
                )
            }
        }
        ContentNode::List {
            ordered,
            items,
            id,
        } => {
            let tag = if *ordered { "ol" } else { "ul" };
            let style_attr = id
                .as_ref()
                .and_then(|id| resolve_style(id, styles))
                .map(|s| format!(r#" style="{}""#, s))
                .unwrap_or_default();
            let data_id = id
                .as_ref()
                .map(|id| format!(r#" data-mdxx-id="{}""#, id))
                .unwrap_or_default();
            let mut html = format!("<{tag}{style}{data}>\n", tag = tag, style = style_attr, data = data_id);
            for item in items {
                html.push_str(&render_list_item(item, styles));
            }
            html.push_str(&format!("</{}>\n", tag));
            html
        }
        ContentNode::BlockQuote { children, id } => {
            let style_attr = id
                .as_ref()
                .and_then(|id| resolve_style(id, styles))
                .map(|s| format!(r#" style="{}""#, s))
                .unwrap_or_default();
            let data_id = id
                .as_ref()
                .map(|id| format!(r#" data-mdxx-id="{}""#, id))
                .unwrap_or_default();
            let mut html = format!("<blockquote{style}{data}>\n", style = style_attr, data = data_id);
            for child in children {
                html.push_str(&render_node(child, styles));
            }
            html.push_str("</blockquote>\n");
            html
        }
        ContentNode::CodeBlock {
            language,
            code,
            id,
        } => {
            let style_attr = id
                .as_ref()
                .and_then(|id| resolve_style(id, styles))
                .map(|s| format!(r#" style="{}""#, s))
                .unwrap_or_default();
            let data_id = id
                .as_ref()
                .map(|id| format!(r#" data-mdxx-id="{}""#, id))
                .unwrap_or_default();
            let lang_class = language
                .as_ref()
                .map(|l| format!(r#" class="language-{}""#, l))
                .unwrap_or_default();
            format!(
                "<pre{style}{data}><code{lang}>{code}</code></pre>\n",
                style = style_attr,
                data = data_id,
                lang = lang_class,
                code = html_escape(code),
            )
        }
        ContentNode::Table {
            headers,
            rows,
            id,
            ..
        } => {
            let style_attr = id
                .as_ref()
                .and_then(|id| resolve_style(id, styles))
                .map(|s| format!(r#" style="{}""#, s))
                .unwrap_or_default();
            let data_id = id
                .as_ref()
                .map(|id| format!(r#" data-mdxx-id="{}""#, id))
                .unwrap_or_default();

            let header_bg = id
                .as_ref()
                .and_then(|id| get_property(id, "header-bg", styles));
            let header_fw = id
                .as_ref()
                .and_then(|id| get_property(id, "header-font-weight", styles));

            let mut html = format!("<table{style}{data}>\n", style = style_attr, data = data_id);

            // Header
            html.push_str("<thead><tr>");
            for h in headers {
                let mut th_style_parts = Vec::new();
                if let Some(ref bg) = header_bg {
                    th_style_parts.push(format!("background: {}", bg));
                }
                if let Some(ref fw) = header_fw {
                    th_style_parts.push(format!("font-weight: {}", fw));
                }
                let th_style = if th_style_parts.is_empty() {
                    String::new()
                } else {
                    format!(r#" style="{}""#, th_style_parts.join("; "))
                };
                html.push_str(&format!("<th{}>{}</th>", th_style, html_escape(h)));
            }
            html.push_str("</tr></thead>\n");

            // Body
            let stripe = id
                .as_ref()
                .and_then(|id| get_property(id, "stripe", styles));
            html.push_str("<tbody>");
            for (row_idx, row) in rows.iter().enumerate() {
                let row_style = if row_idx % 2 == 1 {
                    stripe
                        .as_ref()
                        .map(|s| format!(r#" style="background: {}""#, s))
                        .unwrap_or_default()
                } else {
                    String::new()
                };
                html.push_str(&format!("<tr{}>", row_style));
                for cell in row {
                    html.push_str(&format!("<td>{}</td>", html_escape(cell)));
                }
                html.push_str("</tr>");
            }
            html.push_str("</tbody></table>\n");
            html
        }
        ContentNode::ThematicBreak => "<hr />\n".to_string(),
        ContentNode::PageBreak => {
            r#"<div class="mdxx-pagebreak" style="page-break-after: always;"></div>"#.to_string()
        }
        ContentNode::Html { html } => format!("{}\n", html),
    }
}

fn render_list_item(item: &ListItem, styles: &StyleSheet) -> String {
    let checkbox = match item.checked {
        Some(true) => r#"<input type="checkbox" checked disabled /> "#.to_string(),
        Some(false) => r#"<input type="checkbox" disabled /> "#.to_string(),
        None => String::new(),
    };
    format!(
        "<li>{}{}</li>\n",
        checkbox,
        render_inlines(&item.children, styles)
    )
}

fn render_inlines(inlines: &[InlineNode], styles: &StyleSheet) -> String {
    let mut html = String::new();
    for inline in inlines {
        match inline {
            InlineNode::Text { text } => html.push_str(&html_escape(text)),
            InlineNode::Bold { children } => {
                html.push_str("<strong>");
                html.push_str(&render_inlines(children, styles));
                html.push_str("</strong>");
            }
            InlineNode::Italic { children } => {
                html.push_str("<em>");
                html.push_str(&render_inlines(children, styles));
                html.push_str("</em>");
            }
            InlineNode::Code { text } => {
                html.push_str(&format!("<code>{}</code>", html_escape(text)));
            }
            InlineNode::Link { text, url } => {
                html.push_str(&format!(
                    "<a href=\"{}\">{}</a>",
                    html_escape(url),
                    html_escape(text)
                ));
            }
            InlineNode::CommentAnchor { id, children } => {
                html.push_str(&format!(
                    r#"<span data-comment="{}">{}</span>"#,
                    id,
                    render_inlines(children, styles)
                ));
            }
            InlineNode::StyledSpan { id, children } => {
                let style_attr = resolve_style(id, styles)
                    .map(|s| format!(r#" style="{}""#, s))
                    .unwrap_or_default();
                html.push_str(&format!(
                    r#"<span data-style="{}"{style}>{}</span>"#,
                    id,
                    render_inlines(children, styles),
                    style = style_attr,
                ));
            }
            InlineNode::Strikethrough { children } => {
                html.push_str("<del>");
                html.push_str(&render_inlines(children, styles));
                html.push_str("</del>");
            }
        }
    }
    html
}

/// Resolve style properties for an element ID into a CSS inline style string.
fn resolve_style(id: &str, styles: &StyleSheet) -> Option<String> {
    let element = styles.elements.iter().find(|e| e.id == id)?;
    let css = properties_to_css(&element.properties);
    if css.is_empty() {
        None
    } else {
        Some(css)
    }
}

fn resolve_image_style(id: &str, styles: &StyleSheet) -> Option<String> {
    let element = styles.elements.iter().find(|e| e.id == id)?;
    let mut parts = Vec::new();
    for prop in &element.properties {
        match prop.key.as_str() {
            "width" => parts.push(format!("width: {}", prop.value)),
            "max-width" => parts.push(format!("max-width: {}", prop.value)),
            "height" => parts.push(format!("height: {}", prop.value)),
            "border" => parts.push(format!("border: {}", prop.value)),
            "border-radius" => parts.push(format!("border-radius: {}", prop.value)),
            "shadow" => parts.push(format!("box-shadow: {}", prop.value)),
            "object-fit" => parts.push(format!("object-fit: {}", prop.value)),
            _ => {}
        }
    }
    if parts.is_empty() {
        None
    } else {
        Some(format!(r#" style="{}""#, parts.join("; ")))
    }
}

fn resolve_figure_style(id: &str, styles: &StyleSheet) -> Option<String> {
    let element = styles.elements.iter().find(|e| e.id == id)?;
    let mut parts = Vec::new();
    for prop in &element.properties {
        match prop.key.as_str() {
            "align" => match prop.value.as_str() {
                "center" => parts.push("text-align: center".to_string()),
                "right" => parts.push("text-align: right".to_string()),
                _ => parts.push("text-align: left".to_string()),
            },
            "margin" => parts.push(format!("margin: {}", prop.value)),
            _ => {}
        }
    }
    if parts.is_empty() {
        None
    } else {
        Some(parts.join("; "))
    }
}

fn get_property(id: &str, key: &str, styles: &StyleSheet) -> Option<String> {
    let element = styles.elements.iter().find(|e| e.id == id)?;
    element
        .properties
        .iter()
        .find(|p| p.key == key)
        .map(|p| p.value.clone())
}

fn properties_to_css(properties: &[StyleProperty]) -> String {
    let mut parts = Vec::new();
    for prop in properties {
        let css = match prop.key.as_str() {
            "font-family" => Some(format!("font-family: {}", prop.value)),
            "font-size" => Some(format!("font-size: {}", prop.value)),
            "font-weight" => Some(format!("font-weight: {}", prop.value)),
            "font-style" => Some(format!("font-style: {}", prop.value)),
            "color" => Some(format!("color: {}", prop.value)),
            "background" => Some(format!("background-color: {}", prop.value)),
            "align" | "text-align" => Some(format!("text-align: {}", prop.value)),
            "text-transform" => Some(format!("text-transform: {}", prop.value)),
            "text-decoration" => Some(format!("text-decoration: {}", prop.value)),
            "letter-spacing" => Some(format!("letter-spacing: {}", prop.value)),
            "line-height" => Some(format!("line-height: {}", prop.value)),
            "margin" => Some(format!("margin: {}", prop.value)),
            "margin-top" => Some(format!("margin-top: {}", prop.value)),
            "margin-bottom" => Some(format!("margin-bottom: {}", prop.value)),
            "margin-left" => Some(format!("margin-left: {}", prop.value)),
            "margin-right" => Some(format!("margin-right: {}", prop.value)),
            "padding" => Some(format!("padding: {}", prop.value)),
            "padding-top" => Some(format!("padding-top: {}", prop.value)),
            "padding-bottom" => Some(format!("padding-bottom: {}", prop.value)),
            "padding-left" => Some(format!("padding-left: {}", prop.value)),
            "padding-right" => Some(format!("padding-right: {}", prop.value)),
            "border" => Some(format!("border: {}", prop.value)),
            "border-top" => Some(format!("border-top: {}", prop.value)),
            "border-bottom" => Some(format!("border-bottom: {}", prop.value)),
            "border-left" => Some(format!("border-left: {}", prop.value)),
            "border-right" => Some(format!("border-right: {}", prop.value)),
            "border-radius" => Some(format!("border-radius: {}", prop.value)),
            "shadow" => Some(format!("box-shadow: {}", prop.value)),
            "width" => Some(format!("width: {}", prop.value)),
            "max-width" => Some(format!("max-width: {}", prop.value)),
            // Skip mdxx-specific properties that don't map to CSS
            "caption" | "caption-font-size" | "caption-color" | "line-numbers"
            | "highlight-lines" | "theme" | "border-style" | "header-bg"
            | "header-font-weight" | "cell-padding" | "stripe" | "column-widths"
            | "list-style" | "indent" | "item-spacing" | "object-fit" => None,
            _ => None, // silently ignore unknown
        };
        if let Some(css_str) = css {
            parts.push(css_str);
        }
    }
    parts.join("; ")
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::content::parse_content;
    use crate::splitter::split_sections;
    use crate::style::parse_styles;
    use crate::types::MdxxDocument;

    fn parse_full(input: &str) -> (MdxxDocument, String) {
        let sections = split_sections(input);
        let (content_nodes, _) = parse_content(&sections.content);
        let (styles, _) = match &sections.styling {
            Some(s) => parse_styles(s),
            None => (StyleSheet::default(), vec![]),
        };
        let document = MdxxDocument {
            content: content_nodes,
            styles,
            agent_instructions: sections.agent,
        };
        let html = render_html(&document);
        (document, html)
    }

    #[test]
    fn render_heading_with_style() {
        let input = "# Hello ~title\n\n----------------------------------------\n\n@title {\n  font-size: 32pt;\n  color: #0a0a0a;\n}";
        let (_, html) = parse_full(input);
        assert!(html.contains("<h1"), "Should have h1 tag");
        assert!(html.contains("font-size: 32pt"), "Should have font-size style");
        assert!(html.contains(r#"data-mdxx-id="title""#), "Should have data-mdxx-id");
        assert!(!html.contains("~title"), "Should not contain ~title");
    }

    #[test]
    fn render_comment_anchor() {
        let input = "The {{c1}}enterprise segment{{/c1}} grew.";
        let (_, html) = parse_full(input);
        assert!(html.contains(r#"data-comment="c1""#), "Should have comment span");
        assert!(html.contains("enterprise segment"), "Should have text");
        assert!(!html.contains("{{c1}}"), "Should not contain raw markers");
        assert!(!html.contains("{{/c1}}"), "Should not contain raw markers");
    }

    #[test]
    fn render_styled_span() {
        let input = "We are [on track]{~highlight} to win.\n\n----------------------------------------\n\n@highlight {\n  color: #0066cc;\n  font-weight: 700;\n}";
        let (_, html) = parse_full(input);
        assert!(html.contains(r#"data-style="highlight""#), "Should have styled span");
        assert!(html.contains("color: #0066cc"), "Should have style");
        assert!(!html.contains("{~highlight}"), "Should not contain raw markers");
    }

    #[test]
    fn render_pagebreak() {
        let input = "Before\n\n{{pagebreak}}\n\nAfter";
        let (_, html) = parse_full(input);
        assert!(html.contains("mdxx-pagebreak"), "Should have pagebreak div");
        assert!(html.contains("page-break-after: always"), "Should have page break style");
        assert!(!html.contains("{{pagebreak}}"), "Should not contain raw directive");
    }

    #[test]
    fn render_image_with_caption() {
        let input = "![Chart](chart.png) ~chart1\n\n----------------------------------------\n\n@chart1 {\n  width: 90%;\n  align: center;\n  caption: \"Fig 1. Revenue\";\n  caption-font-size: 9pt;\n}";
        let (_, html) = parse_full(input);
        assert!(html.contains("<figure"), "Should have figure tag");
        assert!(html.contains("<figcaption"), "Should have figcaption");
        assert!(html.contains("Fig 1. Revenue"), "Should have caption text");
    }

    #[test]
    fn render_table_with_header_bg() {
        let input = "| A | B |\n|---|---|\n| 1 | 2 |\n~tbl\n\n----------------------------------------\n\n@tbl {\n  header-bg: #f0f4f8;\n}";
        let (_, html) = parse_full(input);
        assert!(html.contains("<table"), "Should have table");
        assert!(html.contains("background: #f0f4f8"), "Should have header bg");
    }

    #[test]
    fn render_full_report() {
        let input = std::fs::read_to_string("../../examples/report.mdxx").unwrap();
        let (_, html) = parse_full(&input);

        // No raw mdxx markers in output
        assert!(!html.contains("~title"), "No ~id tags in output");
        assert!(!html.contains("~summary"), "No ~id tags in output");
        assert!(!html.contains("{{c1}}"), "No comment markers in output");
        assert!(!html.contains("{{/c1}}"), "No comment markers in output");
        assert!(!html.contains("{{pagebreak}}"), "No directives in output");
        assert!(!html.contains("{~highlight}"), "No span markers in output");

        // Should have key elements
        assert!(html.contains("<h1"), "Should have h1");
        assert!(html.contains("Q4 2025 Revenue Report"), "Should have title text");
        assert!(html.contains("<table"), "Should have table");
        assert!(html.contains("mdxx-pagebreak"), "Should have pagebreak");
        assert!(html.contains(r#"data-comment="c1""#), "Should have comment anchor");
        assert!(html.contains(r#"data-style="highlight""#), "Should have styled span");
        assert!(html.contains("<figure"), "Should have figure for image");
    }
}
