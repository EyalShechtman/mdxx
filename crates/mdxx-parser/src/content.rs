use crate::types::{Alignment, ContentNode, InlineNode, ListItem};
use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd, TextMergeStream};
use regex::Regex;
use std::collections::HashMap;

pub fn parse_content(raw: &str) -> (Vec<ContentNode>, Vec<String>) {
    let (preprocessed, id_map) = preprocess(raw);
    let options = Options::ENABLE_TABLES | Options::ENABLE_STRIKETHROUGH | Options::ENABLE_TASKLISTS;
    let parser = Parser::new_ext(&preprocessed, options);
    let events: Vec<Event> = TextMergeStream::new(parser).collect();
    build_ast(&events, &id_map)
}

/// Pre-process mdxx extensions into HTML that pulldown-cmark can handle.
/// Returns the modified string and a map of line numbers to IDs.
fn preprocess(raw: &str) -> (String, HashMap<usize, String>) {
    let id_re = Regex::new(r"~([a-z][a-z0-9-]*)\s*$").unwrap();
    let pagebreak_re = Regex::new(r"\{\{pagebreak\}\}").unwrap();
    let comment_open_re = Regex::new(r"\{\{([a-z][a-z0-9-]*)\}\}").unwrap();
    let comment_close_re = Regex::new(r"\{\{/([a-z][a-z0-9-]*)\}\}").unwrap();
    let span_re = Regex::new(r"\[([^\]]+)\]\{~([a-z][a-z0-9-]*)\}").unwrap();

    let mut id_map: HashMap<usize, String> = HashMap::new();
    let mut lines: Vec<String> = Vec::new();

    for (i, line) in raw.lines().enumerate() {
        let mut line = line.to_string();

        // Extract ~id from end of line
        if let Some(caps) = id_re.captures(&line) {
            let id = caps.get(1).unwrap().as_str().to_string();
            let match_start = caps.get(0).unwrap().start();
            line = line[..match_start].trim_end().to_string();
            id_map.insert(i, id);
        }

        lines.push(line);
    }

    let mut result = lines.join("\n");

    // Replace {{pagebreak}} with HTML placeholder (before comment processing)
    result = pagebreak_re
        .replace_all(&result, r#"<div class="mdxx-pagebreak"></div>"#)
        .to_string();

    // Replace {{/id}} with </span> (must come before open to avoid re-matching)
    result = comment_close_re
        .replace_all(&result, "</span>")
        .to_string();

    // Replace {{id}} with <span data-comment="id">
    result = comment_open_re
        .replace_all(&result, r#"<span data-comment="$1">"#)
        .to_string();

    // Replace [text]{~id} with styled span
    result = span_re
        .replace_all(&result, r#"<span data-style="$2">$1</span>"#)
        .to_string();

    (result, id_map)
}

/// Find the ID for a given source range by checking which line number maps to an ID.
fn find_id_for_line(line_num: usize, id_map: &HashMap<usize, String>) -> Option<String> {
    id_map.get(&line_num).cloned()
}

/// Given a source offset into the preprocessed text, find the original line number.
fn offset_to_line(text: &str, offset: usize) -> usize {
    text[..offset.min(text.len())].matches('\n').count()
}

fn build_ast(events: &[Event], id_map: &HashMap<usize, String>) -> (Vec<ContentNode>, Vec<String>) {
    let mut nodes: Vec<ContentNode> = Vec::new();
    let mut errors: Vec<String> = Vec::new();
    let mut i = 0;

    while i < events.len() {
        match &events[i] {
            Event::Start(Tag::Heading { level, .. }) => {
                let level_num = *level as u8;
                i += 1;
                let (inlines, new_i) = collect_inlines(events, i);
                i = new_i + 1; // skip End tag
                let text = inlines_to_text(&inlines);
                nodes.push(ContentNode::Heading {
                    level: level_num,
                    text,
                    id: None, // will be resolved later
                    children: inlines,
                });
            }
            Event::Start(Tag::Paragraph) => {
                i += 1;

                // Check if this paragraph contains a standalone image
                // pulldown-cmark wraps ![alt](src) in a paragraph
                if i < events.len() {
                    if let Event::Start(Tag::Image { dest_url, .. }) = &events[i] {
                        let src = dest_url.to_string();
                        i += 1;
                        let mut alt = String::new();
                        while i < events.len() {
                            match &events[i] {
                                Event::Text(t) => {
                                    alt.push_str(t);
                                    i += 1;
                                }
                                Event::End(TagEnd::Image) => break,
                                _ => { i += 1; }
                            }
                        }
                        i += 1; // skip End(Image)
                        // Skip to End(Paragraph)
                        while i < events.len() {
                            if matches!(&events[i], Event::End(TagEnd::Paragraph)) {
                                break;
                            }
                            i += 1;
                        }
                        i += 1; // skip End(Paragraph)
                        nodes.push(ContentNode::Image { alt, src, id: None });
                        continue;
                    }
                }

                let (inlines, new_i) = collect_inlines(events, i);
                i = new_i + 1; // skip End tag

                let text = inlines_to_text(&inlines);
                if text.is_empty() && inlines.is_empty() {
                    continue;
                }

                nodes.push(ContentNode::Paragraph {
                    text: text.clone(),
                    id: None,
                    children: inlines,
                });
            }
            Event::Start(Tag::BlockQuote(_)) => {
                i += 1;
                let (children, new_i) = collect_block_children(events, i, id_map);
                i = new_i + 1; // skip End tag
                nodes.push(ContentNode::BlockQuote {
                    children,
                    id: None,
                });
            }
            Event::Start(Tag::List(start_num)) => {
                let ordered = start_num.is_some();
                i += 1;
                let (items, new_i) = collect_list_items(events, i);
                i = new_i + 1; // skip End tag
                nodes.push(ContentNode::List {
                    ordered,
                    items,
                    id: None,
                });
            }
            Event::Start(Tag::CodeBlock(kind)) => {
                let language = match kind {
                    pulldown_cmark::CodeBlockKind::Fenced(lang) => {
                        let l = lang.to_string();
                        if l.is_empty() {
                            None
                        } else {
                            Some(l)
                        }
                    }
                    pulldown_cmark::CodeBlockKind::Indented => None,
                };
                i += 1;
                let mut code = String::new();
                while i < events.len() {
                    match &events[i] {
                        Event::Text(t) => {
                            code.push_str(t);
                            i += 1;
                        }
                        Event::End(TagEnd::CodeBlock) => break,
                        _ => {
                            i += 1;
                        }
                    }
                }
                i += 1; // skip End
                nodes.push(ContentNode::CodeBlock {
                    language,
                    code,
                    id: None,
                });
            }
            Event::Start(Tag::Table(alignments)) => {
                let aligns: Vec<Alignment> = alignments
                    .iter()
                    .map(|a| match a {
                        pulldown_cmark::Alignment::Left => Alignment::Left,
                        pulldown_cmark::Alignment::Center => Alignment::Center,
                        pulldown_cmark::Alignment::Right => Alignment::Right,
                        pulldown_cmark::Alignment::None => Alignment::None,
                    })
                    .collect();
                i += 1;
                let (headers, rows, new_i) = collect_table(events, i);
                i = new_i + 1;
                nodes.push(ContentNode::Table {
                    headers,
                    rows,
                    alignments: aligns,
                    id: None,
                });
            }
            Event::Start(Tag::Image { dest_url, title, .. }) => {
                let src = dest_url.to_string();
                i += 1;
                let mut alt = String::new();
                while i < events.len() {
                    match &events[i] {
                        Event::Text(t) => {
                            alt.push_str(t);
                            i += 1;
                        }
                        Event::End(TagEnd::Image) => break,
                        _ => {
                            i += 1;
                        }
                    }
                }
                i += 1;
                nodes.push(ContentNode::Image {
                    alt,
                    src,
                    id: None,
                });
            }
            Event::Html(html) | Event::InlineHtml(html) => {
                let html_str = html.to_string();
                if html_str.contains("mdxx-pagebreak") {
                    nodes.push(ContentNode::PageBreak);
                } else {
                    nodes.push(ContentNode::Html {
                        html: html_str,
                    });
                }
                i += 1;
            }
            Event::Rule => {
                nodes.push(ContentNode::ThematicBreak);
                i += 1;
            }
            _ => {
                i += 1;
            }
        }
    }

    // Now assign IDs from the id_map.
    // Strategy: IDs on the same line as a block element (headings, paragraphs with ~id at end)
    // or on a line immediately after the last line of a block (lists, tables, code blocks, blockquotes).
    // We need to go through id_map values and assign them to the nearest preceding block.
    assign_ids(&mut nodes, id_map);

    (nodes, errors)
}

/// Assign IDs from the id_map to content nodes.
/// The id_map maps original line numbers to IDs.
/// Headings/paragraphs: ID was on same line, now stripped.
/// Lists/tables/blockquotes/code blocks: ID is on the line after the block.
fn assign_ids(nodes: &mut Vec<ContentNode>, id_map: &HashMap<usize, String>) {
    // Sort IDs by line number
    let mut sorted_ids: Vec<(usize, String)> = id_map.iter().map(|(k, v)| (*k, v.clone())).collect();
    sorted_ids.sort_by_key(|(k, _)| *k);

    // Simple sequential assignment: assign each ID to the node that most recently started/ended
    // before or at that line number. Since we process in order, we assign IDs to nodes sequentially.
    let mut id_idx = 0;
    let mut node_idx = 0;

    // For a simpler approach: assign IDs in order to nodes in order.
    // The id_map line numbers correspond to the original source, and the nodes
    // are in source order, so the nth ID goes to approximately the nth "id-able" node.
    for (_, id) in &sorted_ids {
        if node_idx >= nodes.len() {
            break;
        }
        set_node_id(&mut nodes[node_idx], id.clone());
        node_idx += 1;
        // Skip nodes that can't have IDs (ThematicBreak, PageBreak, Html)
        while node_idx < nodes.len() && !node_can_have_id(&nodes[node_idx]) {
            node_idx += 1;
        }
    }
}

fn node_can_have_id(node: &ContentNode) -> bool {
    !matches!(
        node,
        ContentNode::ThematicBreak | ContentNode::PageBreak | ContentNode::Html { .. }
    )
}

fn set_node_id(node: &mut ContentNode, id: String) {
    match node {
        ContentNode::Heading { id: ref mut nid, .. }
        | ContentNode::Paragraph { id: ref mut nid, .. }
        | ContentNode::Image { id: ref mut nid, .. }
        | ContentNode::List { id: ref mut nid, .. }
        | ContentNode::BlockQuote { id: ref mut nid, .. }
        | ContentNode::CodeBlock { id: ref mut nid, .. }
        | ContentNode::Table { id: ref mut nid, .. } => {
            *nid = Some(id);
        }
        _ => {}
    }
}

fn collect_inlines(events: &[Event], start: usize) -> (Vec<InlineNode>, usize) {
    let mut inlines: Vec<InlineNode> = Vec::new();
    let mut i = start;

    while i < events.len() {
        match &events[i] {
            Event::Text(t) => {
                let text = t.to_string();
                // Check for data-comment spans that might be in raw text
                inlines.push(InlineNode::Text { text });
                i += 1;
            }
            Event::Code(t) => {
                inlines.push(InlineNode::Code {
                    text: t.to_string(),
                });
                i += 1;
            }
            Event::Start(Tag::Strong) => {
                i += 1;
                let (children, new_i) = collect_inlines(events, i);
                i = new_i + 1;
                inlines.push(InlineNode::Bold { children });
            }
            Event::Start(Tag::Emphasis) => {
                i += 1;
                let (children, new_i) = collect_inlines(events, i);
                i = new_i + 1;
                inlines.push(InlineNode::Italic { children });
            }
            Event::Start(Tag::Strikethrough) => {
                i += 1;
                let (children, new_i) = collect_inlines(events, i);
                i = new_i + 1;
                inlines.push(InlineNode::Strikethrough { children });
            }
            Event::Start(Tag::Link { dest_url, .. }) => {
                let url = dest_url.to_string();
                i += 1;
                let (children, new_i) = collect_inlines(events, i);
                i = new_i + 1;
                let text = inlines_to_text(&children);
                inlines.push(InlineNode::Link { text, url });
            }
            Event::SoftBreak | Event::HardBreak => {
                inlines.push(InlineNode::Text {
                    text: " ".to_string(),
                });
                i += 1;
            }
            Event::InlineHtml(html) => {
                let html_str = html.to_string();
                // Parse comment anchors: <span data-comment="id">
                if let Some(id) = extract_data_attr(&html_str, "data-comment") {
                    i += 1;
                    let (children, new_i) = collect_until_close_span(events, i);
                    i = new_i;
                    inlines.push(InlineNode::CommentAnchor { id, children });
                } else if let Some(id) = extract_data_attr(&html_str, "data-style") {
                    i += 1;
                    let (children, new_i) = collect_until_close_span(events, i);
                    i = new_i;
                    inlines.push(InlineNode::StyledSpan { id, children });
                } else {
                    inlines.push(InlineNode::Text {
                        text: html_str,
                    });
                    i += 1;
                }
            }
            Event::End(TagEnd::Heading(_))
            | Event::End(TagEnd::Paragraph)
            | Event::End(TagEnd::Strong)
            | Event::End(TagEnd::Emphasis)
            | Event::End(TagEnd::Strikethrough)
            | Event::End(TagEnd::Link)
            | Event::End(TagEnd::BlockQuote(_)) => {
                return (inlines, i);
            }
            _ => {
                return (inlines, i);
            }
        }
    }

    (inlines, i)
}

/// Collect inline nodes until we see a </span> in InlineHtml
fn collect_until_close_span(events: &[Event], start: usize) -> (Vec<InlineNode>, usize) {
    let mut inlines: Vec<InlineNode> = Vec::new();
    let mut i = start;

    while i < events.len() {
        match &events[i] {
            Event::InlineHtml(html) if html.as_ref() == "</span>" => {
                i += 1;
                return (inlines, i);
            }
            Event::Text(t) => {
                inlines.push(InlineNode::Text {
                    text: t.to_string(),
                });
                i += 1;
            }
            Event::Code(t) => {
                inlines.push(InlineNode::Code {
                    text: t.to_string(),
                });
                i += 1;
            }
            Event::Start(Tag::Strong) => {
                i += 1;
                let (children, new_i) = collect_inlines(events, i);
                i = new_i + 1;
                inlines.push(InlineNode::Bold { children });
            }
            Event::Start(Tag::Emphasis) => {
                i += 1;
                let (children, new_i) = collect_inlines(events, i);
                i = new_i + 1;
                inlines.push(InlineNode::Italic { children });
            }
            Event::SoftBreak | Event::HardBreak => {
                inlines.push(InlineNode::Text {
                    text: " ".to_string(),
                });
                i += 1;
            }
            _ => {
                i += 1;
            }
        }
    }

    (inlines, i)
}

fn extract_data_attr(html: &str, attr: &str) -> Option<String> {
    let pattern = format!(r#"{}="([^"]*)""#, attr);
    let re = Regex::new(&pattern).ok()?;
    re.captures(html).map(|c| c.get(1).unwrap().as_str().to_string())
}

fn collect_block_children(
    events: &[Event],
    start: usize,
    id_map: &HashMap<usize, String>,
) -> (Vec<ContentNode>, usize) {
    let mut children: Vec<ContentNode> = Vec::new();
    let mut i = start;

    while i < events.len() {
        match &events[i] {
            Event::End(TagEnd::BlockQuote(_)) => {
                return (children, i);
            }
            Event::Start(Tag::Paragraph) => {
                i += 1;
                let (inlines, new_i) = collect_inlines(events, i);
                i = new_i + 1;
                let text = inlines_to_text(&inlines);
                children.push(ContentNode::Paragraph {
                    text,
                    id: None,
                    children: inlines,
                });
            }
            _ => {
                i += 1;
            }
        }
    }

    (children, i)
}

fn collect_list_items(events: &[Event], start: usize) -> (Vec<ListItem>, usize) {
    let mut items: Vec<ListItem> = Vec::new();
    let mut i = start;

    while i < events.len() {
        match &events[i] {
            Event::End(TagEnd::List(_)) => {
                return (items, i);
            }
            Event::Start(Tag::Item) => {
                i += 1;
                // Items may contain paragraphs or direct text
                let mut children: Vec<InlineNode> = Vec::new();
                let mut checked = None;

                while i < events.len() {
                    match &events[i] {
                        Event::End(TagEnd::Item) => {
                            break;
                        }
                        Event::Start(Tag::Paragraph) => {
                            i += 1;
                            let (inlines, new_i) = collect_inlines(events, i);
                            i = new_i + 1;
                            children.extend(inlines);
                        }
                        Event::Text(t) => {
                            children.push(InlineNode::Text {
                                text: t.to_string(),
                            });
                            i += 1;
                        }
                        Event::TaskListMarker(c) => {
                            checked = Some(*c);
                            i += 1;
                        }
                        Event::SoftBreak | Event::HardBreak => {
                            children.push(InlineNode::Text {
                                text: " ".to_string(),
                            });
                            i += 1;
                        }
                        _ => {
                            i += 1;
                        }
                    }
                }
                i += 1; // skip End(Item)
                items.push(ListItem { children, checked });
            }
            _ => {
                i += 1;
            }
        }
    }

    (items, i)
}

fn collect_table(events: &[Event], start: usize) -> (Vec<String>, Vec<Vec<String>>, usize) {
    let mut headers: Vec<String> = Vec::new();
    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut i = start;
    let mut in_head = false;
    let mut current_row: Vec<String> = Vec::new();
    let mut current_cell = String::new();

    while i < events.len() {
        match &events[i] {
            Event::End(TagEnd::Table) => {
                return (headers, rows, i);
            }
            Event::Start(Tag::TableHead) => {
                in_head = true;
                i += 1;
            }
            Event::End(TagEnd::TableHead) => {
                in_head = false;
                headers = current_row.clone();
                current_row.clear();
                i += 1;
            }
            Event::Start(Tag::TableRow) => {
                current_row = Vec::new();
                i += 1;
            }
            Event::End(TagEnd::TableRow) => {
                if !in_head {
                    rows.push(current_row.clone());
                }
                current_row.clear();
                i += 1;
            }
            Event::Start(Tag::TableCell) => {
                current_cell = String::new();
                i += 1;
            }
            Event::End(TagEnd::TableCell) => {
                current_row.push(current_cell.clone());
                current_cell.clear();
                i += 1;
            }
            Event::Text(t) => {
                current_cell.push_str(t);
                i += 1;
            }
            Event::Code(t) => {
                current_cell.push_str(&format!("`{}`", t));
                i += 1;
            }
            _ => {
                i += 1;
            }
        }
    }

    (headers, rows, i)
}

fn inlines_to_text(inlines: &[InlineNode]) -> String {
    let mut text = String::new();
    for inline in inlines {
        match inline {
            InlineNode::Text { text: t } => text.push_str(t),
            InlineNode::Bold { children } => text.push_str(&inlines_to_text(children)),
            InlineNode::Italic { children } => text.push_str(&inlines_to_text(children)),
            InlineNode::Code { text: t } => text.push_str(t),
            InlineNode::Link { text: t, .. } => text.push_str(t),
            InlineNode::CommentAnchor { children, .. } => {
                text.push_str(&inlines_to_text(children))
            }
            InlineNode::StyledSpan { children, .. } => {
                text.push_str(&inlines_to_text(children))
            }
            InlineNode::Strikethrough { children } => text.push_str(&inlines_to_text(children)),
        }
    }
    text
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_heading_with_id() {
        let input = "# Hello World ~title";
        let (nodes, errors) = parse_content(input);
        assert!(errors.is_empty());
        assert_eq!(nodes.len(), 1);
        match &nodes[0] {
            ContentNode::Heading {
                level, text, id, ..
            } => {
                assert_eq!(*level, 1);
                assert_eq!(text, "Hello World");
                assert_eq!(id.as_deref(), Some("title"));
            }
            _ => panic!("Expected Heading"),
        }
    }

    #[test]
    fn parse_paragraph_with_id() {
        let input = "This is a paragraph. ~p1";
        let (nodes, errors) = parse_content(input);
        assert!(errors.is_empty());
        assert_eq!(nodes.len(), 1);
        match &nodes[0] {
            ContentNode::Paragraph { text, id, .. } => {
                assert_eq!(text, "This is a paragraph.");
                assert_eq!(id.as_deref(), Some("p1"));
            }
            _ => panic!("Expected Paragraph"),
        }
    }

    #[test]
    fn parse_comment_anchor() {
        let input = "The {{c1}}enterprise segment{{/c1}} showed growth.";
        let (nodes, errors) = parse_content(input);
        assert!(errors.is_empty());
        assert_eq!(nodes.len(), 1);
        if let ContentNode::Paragraph { children, .. } = &nodes[0] {
            let has_comment = children.iter().any(|n| matches!(n, InlineNode::CommentAnchor { id, .. } if id == "c1"));
            assert!(has_comment, "Should have CommentAnchor with id c1");
        } else {
            panic!("Expected Paragraph");
        }
    }

    #[test]
    fn parse_styled_span() {
        let input = "We are [on track to exceed]{~highlight} our target.";
        let (nodes, errors) = parse_content(input);
        assert!(errors.is_empty());
        assert_eq!(nodes.len(), 1);
        if let ContentNode::Paragraph { children, .. } = &nodes[0] {
            let has_span = children.iter().any(|n| matches!(n, InlineNode::StyledSpan { id, .. } if id == "highlight"));
            assert!(has_span, "Should have StyledSpan with id highlight");
        } else {
            panic!("Expected Paragraph");
        }
    }

    #[test]
    fn parse_pagebreak() {
        let input = "Before\n\n{{pagebreak}}\n\nAfter";
        let (nodes, errors) = parse_content(input);
        assert!(errors.is_empty());
        let has_pagebreak = nodes.iter().any(|n| matches!(n, ContentNode::PageBreak));
        assert!(has_pagebreak, "Should have PageBreak node");
    }

    #[test]
    fn parse_table() {
        let input = "| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |";
        let (nodes, errors) = parse_content(input);
        assert!(errors.is_empty());
        if let ContentNode::Table {
            headers, rows, ..
        } = &nodes[0]
        {
            assert_eq!(headers, &["A", "B"]);
            assert_eq!(rows.len(), 2);
            assert_eq!(rows[0], vec!["1", "2"]);
        } else {
            panic!("Expected Table");
        }
    }

    #[test]
    fn parse_image() {
        let input = "![Alt text](image.png) ~hero";
        let (nodes, errors) = parse_content(input);
        assert!(errors.is_empty());
        let has_img = nodes.iter().any(|n| {
            matches!(n, ContentNode::Image { alt, src, id } if alt == "Alt text" && src == "image.png" && id.as_deref() == Some("hero"))
        });
        assert!(has_img, "Should have Image node with id");
    }

    #[test]
    fn parse_blockquote() {
        let input = "> Some quote text\n> More text";
        let (nodes, errors) = parse_content(input);
        assert!(errors.is_empty());
        assert!(matches!(&nodes[0], ContentNode::BlockQuote { .. }));
    }

    #[test]
    fn parse_list_with_id() {
        let input = "- Item one\n- Item two\n~my-list";
        let (nodes, errors) = parse_content(input);
        assert!(errors.is_empty());
        let has_list = nodes.iter().any(|n| {
            matches!(n, ContentNode::List { id, .. } if id.as_deref() == Some("my-list"))
        });
        assert!(has_list, "Should have List with id my-list");
    }

    #[test]
    fn untagged_elements_have_no_id() {
        let input = "# Heading\n\nParagraph without id.";
        let (nodes, errors) = parse_content(input);
        assert!(errors.is_empty());
        for node in &nodes {
            match node {
                ContentNode::Heading { id, .. } => assert!(id.is_none()),
                ContentNode::Paragraph { id, .. } => assert!(id.is_none()),
                _ => {}
            }
        }
    }

    #[test]
    fn parse_thematic_break() {
        let input = "Before\n\n***\n\nAfter";
        let (nodes, errors) = parse_content(input);
        assert!(errors.is_empty());
        let has_break = nodes.iter().any(|n| matches!(n, ContentNode::ThematicBreak));
        assert!(has_break, "Should have ThematicBreak");
    }
}
