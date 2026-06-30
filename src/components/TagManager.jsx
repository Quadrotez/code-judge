import React, { useState, useEffect } from 'react'
import { getTags, saveTag, deleteTag } from '../utils/storage'
import { onAuthUpdate, isAdminLoggedIn } from '../utils/auth'
import Icon from './Icon'

export const TagManager = ({ onUpdate }) => {
  const [tags, setTags] = useState([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagDesc, setNewTagDesc] = useState('')

  useEffect(() => {
    loadTags()
    const unsubscribe = onAuthUpdate(() => {
      loadTags()
    })
    return () => unsubscribe()
  }, [])

  const loadTags = async () => {
    try {
      const data = await getTags()
      setTags(data)
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) return
    if (!isAdminLoggedIn()) {
      alert('Ошибка доступа: вы не авторизованы как администратор')
      return
    }
    try {
      // Create a unique ID for the tag if it doesn't exist
      const tagId = `tag_${Date.now()}`
      await saveTag({
        id: tagId,
        name: newTagName.trim(),
        description: newTagDesc.trim() || '' // Description is now optional
      })
      setNewTagName('')
      setNewTagDesc('')
      await loadTags()
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Tag save error:', error)
      alert('Ошибка при сохранении тега. Проверьте консоль для деталей.')
    }
  }

  const handleDeleteTag = async (id) => {
    if (!confirm('Удалить этот тег?')) return
    try {
      await deleteTag(id)
      await loadTags()
      if (onUpdate) onUpdate()
    } catch (error) {
      alert('Ошибка при удалении тега')
    }
  }

  return (
    <div className="tag-manager-content">
      <div className="tag-form-row">
        <div className="form-group" style={{marginBottom:0}}>
          <label>Название</label>
          <input 
            type="text" 
            placeholder="Напр. Динамика" 
            value={newTagName} 
            onChange={(e) => setNewTagName(e.target.value)} 
            className="form-input"
          />
        </div>
        <div className="form-group" style={{marginBottom:0}}>
          <label>Описание (опц.)</label>
          <input 
            type="text" 
            placeholder="Краткое описание" 
            value={newTagDesc} 
            onChange={(e) => setNewTagDesc(e.target.value)} 
            className="form-input"
          />
        </div>
        <button onClick={handleAddTag} className="btn btn-primary">
          <Icon name="plus" size={16} /> Добавить
        </button>
      </div>

      <div className="tags-list-scroll">
        {tags.length === 0 ? (
          <p style={{textAlign:'center', color:'var(--text-secondary)'}}>Тегов пока нет</p>
        ) : (
          tags.map(tag => (
            <div key={tag.id} className="tag-item">
              <div className="tag-info">
                <span className="mini-tag" style={{background:'var(--primary)', color:'white', borderColor:'var(--primary)'}}>{tag.name}</span>
                {tag.description && <span className="tag-description">{tag.description}</span>}
              </div>
              <button onClick={() => handleDeleteTag(tag.id)} className="btn-icon text-red">
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
