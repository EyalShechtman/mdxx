use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MdxxDocument {
    pub content: Vec<ContentNode>,
    pub styles: StyleSheet,
    pub agent_instructions: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
pub enum ContentNode {
    Heading {
        level: u8,
        text: String,
        id: Option<String>,
        children: Vec<InlineNode>,
    },
    Paragraph {
        text: String,
        id: Option<String>,
        children: Vec<InlineNode>,
    },
    Image {
        alt: String,
        src: String,
        id: Option<String>,
    },
    List {
        ordered: bool,
        items: Vec<ListItem>,
        id: Option<String>,
    },
    BlockQuote {
        children: Vec<ContentNode>,
        id: Option<String>,
    },
    CodeBlock {
        language: Option<String>,
        code: String,
        id: Option<String>,
    },
    Table {
        headers: Vec<String>,
        rows: Vec<Vec<String>>,
        alignments: Vec<Alignment>,
        id: Option<String>,
    },
    ThematicBreak,
    PageBreak,
    Html {
        html: String,
    },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
pub enum InlineNode {
    Text { text: String },
    Bold { children: Vec<InlineNode> },
    Italic { children: Vec<InlineNode> },
    Code { text: String },
    Link { text: String, url: String },
    CommentAnchor { id: String, children: Vec<InlineNode> },
    StyledSpan { id: String, children: Vec<InlineNode> },
    Strikethrough { children: Vec<InlineNode> },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ListItem {
    pub children: Vec<InlineNode>,
    pub checked: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy)]
pub enum Alignment {
    Left,
    Center,
    Right,
    None,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StyleSheet {
    pub page: Option<PageStyle>,
    pub header: Option<HeaderFooterStyle>,
    pub footer: Option<HeaderFooterStyle>,
    pub defaults: Option<DefaultStyles>,
    pub elements: Vec<ElementStyle>,
    pub abstracts: Vec<AbstractStyle>,
    pub comments: Vec<CommentDef>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PageStyle {
    pub size: Option<String>,
    pub orientation: Option<String>,
    pub margin: Option<String>,
    pub margin_top: Option<String>,
    pub margin_bottom: Option<String>,
    pub margin_left: Option<String>,
    pub margin_right: Option<String>,
    pub columns: Option<u32>,
    pub column_gap: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HeaderFooterStyle {
    pub content: Option<String>,
    pub font_size: Option<String>,
    pub color: Option<String>,
    pub align: Option<String>,
    pub border_bottom: Option<String>,
    pub border_top: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DefaultStyles {
    pub properties: Vec<StyleProperty>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ElementStyle {
    pub id: String,
    pub inherit: Option<String>,
    pub properties: Vec<StyleProperty>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AbstractStyle {
    pub name: String,
    pub properties: Vec<StyleProperty>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StyleProperty {
    pub key: String,
    pub value: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CommentDef {
    pub id: String,
    pub author: Option<String>,
    pub date: Option<String>,
    pub text: Option<String>,
    pub resolved: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ParseOutput {
    pub document: MdxxDocument,
    pub html: String,
    pub errors: Vec<String>,
}
