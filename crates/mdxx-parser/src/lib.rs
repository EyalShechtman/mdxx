pub mod content;
pub mod render;
pub mod splitter;
pub mod style;
pub mod types;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn parse_mdxx(input: &str) -> Result<JsValue, JsValue> {
    let sections = splitter::split_sections(input);
    let (content_nodes, mut errors) = content::parse_content(&sections.content);
    let (styles, style_errors) = match &sections.styling {
        Some(s) => style::parse_styles(s),
        None => (types::StyleSheet::default(), vec![]),
    };
    errors.extend(style_errors);

    let document = types::MdxxDocument {
        content: content_nodes,
        styles,
        agent_instructions: sections.agent,
        chat_history: sections.chat,
    };

    let html = render::render_html(&document);

    let output = types::ParseOutput {
        document,
        html,
        errors,
    };
    serde_wasm_bindgen::to_value(&output).map_err(|e| JsValue::from_str(&e.to_string()))
}
