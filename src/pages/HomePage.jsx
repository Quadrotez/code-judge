import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProblems, getTags } from '../utils/storage'

function HomePage() {
  const [problems, setProblems] = useState([])
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [availableTags, setAvailableTags] = useState([])

  useEffect(() => {
    getProblems().then((all) => setProblems(all.filter((problem) => !problem.hidden)))
    getTags().then(setAvailableTags)
  }, [])

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = problem.title.toLowerCase().includes(search.toLowerCase())
    const matchesTags = selectedTags.length === 0 || selectedTags.every((tag) => problem.tags?.includes(tag))
    return matchesSearch && matchesTags
  })

  const toggleTag = (tagName) => {
    setSelectedTags((previous) => (
      previous.includes(tagName)
        ? previous.filter((tag) => tag !== tagName)
        : [...previous, tagName]
    ))
  }

  return (
    <div className="container">
      <div className="search-section">
        <input
          type="text"
          placeholder="Поиск задач..."
          className="search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Поиск задач"
        />
      </div>

      <section className="tag-filter-section" aria-label="Фильтр задач по тегам">
        <div className="tag-filter-heading">
          <span className="tag-filter-title">Темы</span>
          <span className="tag-filter-count">
            {selectedTags.length > 0 ? `Выбрано: ${selectedTags.length}` : `${availableTags.length} тегов`}
          </span>
          {selectedTags.length > 0 && (
            <button type="button" className="tag-filter-reset" onClick={() => setSelectedTags([])}>
              Сбросить
            </button>
          )}
        </div>
        <div className="tags-filter">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`tag-chip ${selectedTags.includes(tag.name) ? 'active' : ''}`}
              onClick={() => toggleTag(tag.name)}
              aria-pressed={selectedTags.includes(tag.name)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </section>

      <div className="problems-grid">
        {filteredProblems.map((problem) => (
          <Link to={`/problem/${problem.id}`} key={problem.id} className="problem-card">
            <h3>{problem.title}</h3>
            <div className="p-tags">
              {problem.tags?.map((tag) => <span key={tag} className="mini-tag">{tag}</span>)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default HomePage
