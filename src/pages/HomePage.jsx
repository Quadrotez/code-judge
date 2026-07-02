import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProblems, getTags } from '../utils/storage'

function HomePage() {
  const [problems, setProblems] = useState([])
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [availableTags, setAvailableTags] = useState([])

  useEffect(() => {
    getProblems().then((all) => setProblems(all.filter((p) => !p.hidden)))
    getTags().then(setAvailableTags)
  }, [])

  const filteredProblems = problems.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase())
    const matchesTags = selectedTags.length === 0 || selectedTags.every((t) => p.tags?.includes(t))
    return matchesSearch && matchesTags
  })

  const toggleTag = (tagName) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    )
  }

  return (
    <div className="container">
      <div className="search-section">
        <input
          type="text"
          placeholder="Поиск задач..."
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="tags-filter">
        {availableTags.map((tag) => (
          <button
            key={tag.id}
            className={`tag-chip ${selectedTags.includes(tag.name) ? 'active' : ''}`}
            onClick={() => toggleTag(tag.name)}
          >
            {tag.name}
          </button>
        ))}
      </div>

      <div className="problems-grid">
        {filteredProblems.map((p) => (
          <Link to={`/problem/${p.id}`} key={p.id} className="problem-card">
            <h3>{p.title}</h3>
            <div className="p-tags">
              {p.tags?.map((t) => <span key={t} className="mini-tag">{t}</span>)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default HomePage
