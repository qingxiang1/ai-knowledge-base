#!/usr/bin/env ruby
# frozen_string_literal: true

# Check repository Markdown and Docsify sidebar links without external gems.
# Usage: ruby scripts/check_doc_links.rb
require "uri"

ROOT = File.expand_path("..", __dir__)
MARKDOWN_ROOTS = %w[
  00-Roadmap 01-产品经理基础 02-AI基础知识 03-Prompt工程 04-大模型生态
  05-AI应用开发 06-RAG知识库 07-Agent系统 08-MCP生态 09-工作流编排
  10-AI产品设计 11-数据分析 12-商业化 13-竞品分析 14-项目实战
  15-系统设计 16-面试准备 17-作品集 18-AI创业 大模型训练实战 specs
].freeze

failures = []

def local_candidates(path, base)
  clean = URI::DEFAULT_PARSER.unescape(path.split("#", 2).first.split("?", 2).first)
  return [] if clean.empty?

  absolute = clean.start_with?("/") ? File.join(ROOT, clean.delete_prefix("/")) : File.expand_path(clean, base)
  [absolute, "#{absolute}.md", File.join(absolute, "README.md"), File.join(absolute, "index.md")].uniq
end

def check_file(file, failures)
  in_fence = false
  File.readlines(file, encoding: "UTF-8").each_with_index do |line, index|
    in_fence = !in_fence if line.match?(/^\s*```/)
    next if in_fence

    line.scan(/\[[^\]]*\]\(([^)]+)\)/).flatten.each do |target|
      next if target.match?(%r{^(?:https?|mailto):})
      next if target.start_with?("#")
      next if target.start_with?("/Users/", "/private/", "file:")
      next if target.include?(":ignore")

      unless local_candidates(target, File.dirname(file)).any? { |candidate| File.exist?(candidate) }
        failures << "#{file.sub(ROOT + File::SEPARATOR, "")}:#{index + 1} -> #{target}"
      end
    end
  end
end

MARKDOWN_ROOTS.each do |directory|
  Dir.glob(File.join(ROOT, directory, "**", "*.md")).each { |file| check_file(file, failures) }
end
%w[README.md _navbar.md _sidebar.md].each do |file|
  path = File.join(ROOT, file)
  check_file(path, failures) if File.exist?(path)
end

if failures.empty?
  puts "Documentation link check passed."
  exit 0
end

warn "Documentation link check failed (#{failures.length}):"
warn failures.join("\n")
exit 1
