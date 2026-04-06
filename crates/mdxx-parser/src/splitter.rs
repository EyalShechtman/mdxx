pub struct RawSections {
    pub content: String,
    pub styling: Option<String>,
    pub agent: Option<String>,
    pub chat: Option<String>,
}

pub fn split_sections(input: &str) -> RawSections {
    let delimiter_re = regex::Regex::new(r"^-{40,}$").unwrap();
    let mut sections: Vec<String> = vec![String::new()];
    let mut delimiter_count = 0;

    for line in input.lines() {
        if delimiter_count < 3 && delimiter_re.is_match(line) {
            delimiter_count += 1;
            sections.push(String::new());
        } else {
            if let Some(last) = sections.last_mut() {
                if !last.is_empty() {
                    last.push('\n');
                }
                last.push_str(line);
            }
        }
    }

    RawSections {
        content: sections.get(0).cloned().unwrap_or_default(),
        styling: sections.get(1).cloned().filter(|s| !s.is_empty()),
        agent: sections.get(2).cloned().filter(|s| !s.is_empty()),
        chat: sections.get(3).cloned().filter(|s| !s.is_empty()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_delimiters() {
        let input = "# Hello\n\nWorld";
        let sections = split_sections(input);
        assert_eq!(sections.content, "# Hello\n\nWorld");
        assert!(sections.styling.is_none());
        assert!(sections.agent.is_none());
    }

    #[test]
    fn one_delimiter() {
        let input = "# Hello\n----------------------------------------\n@title { font-size: 32pt; }";
        let sections = split_sections(input);
        assert_eq!(sections.content, "# Hello");
        assert_eq!(sections.styling.as_deref(), Some("@title { font-size: 32pt; }"));
        assert!(sections.agent.is_none());
    }

    #[test]
    fn two_delimiters() {
        let input = "Content\n----------------------------------------\nStyling\n----------------------------------------\nAgent instructions";
        let sections = split_sections(input);
        assert_eq!(sections.content, "Content");
        assert_eq!(sections.styling.as_deref(), Some("Styling"));
        assert_eq!(sections.agent.as_deref(), Some("Agent instructions"));
    }

    #[test]
    fn three_delimiters_creates_chat() {
        let input = "Content\n----------------------------------------\nStyling\n----------------------------------------\nAgent\n----------------------------------------\nStill agent";
        let sections = split_sections(input);
        assert_eq!(sections.content, "Content");
        assert_eq!(sections.styling.as_deref(), Some("Styling"));
        assert_eq!(sections.agent.as_deref(), Some("Agent"));
        assert_eq!(sections.chat.as_deref(), Some("Still agent"));
    }

    #[test]
    fn four_plus_delimiters_literal_in_chat() {
        let input = "Content\n----------------------------------------\nStyling\n----------------------------------------\nAgent\n----------------------------------------\nChat\n----------------------------------------\nStill chat";
        let sections = split_sections(input);
        assert_eq!(sections.content, "Content");
        assert_eq!(sections.styling.as_deref(), Some("Styling"));
        assert_eq!(sections.agent.as_deref(), Some("Agent"));
        assert_eq!(sections.chat.as_deref(), Some("Chat\n----------------------------------------\nStill chat"));
    }

    #[test]
    fn thirty_nine_dashes_not_delimiter() {
        let input = "Content\n---------------------------------------\nStill content";
        let sections = split_sections(input);
        assert_eq!(sections.content, "Content\n---------------------------------------\nStill content");
        assert!(sections.styling.is_none());
    }

    #[test]
    fn forty_dashes_is_delimiter() {
        let input = "Content\n----------------------------------------\nStyling";
        let sections = split_sections(input);
        assert_eq!(sections.content, "Content");
        assert_eq!(sections.styling.as_deref(), Some("Styling"));
    }

    #[test]
    fn leading_spaces_not_delimiter() {
        let input = "Content\n  ----------------------------------------\nStill content";
        let sections = split_sections(input);
        assert_eq!(sections.content, "Content\n  ----------------------------------------\nStill content");
        assert!(sections.styling.is_none());
    }

    #[test]
    fn extra_long_delimiter() {
        let input = "Content\n--------------------------------------------\nStyling";
        let sections = split_sections(input);
        assert_eq!(sections.content, "Content");
        assert_eq!(sections.styling.as_deref(), Some("Styling"));
    }
}
