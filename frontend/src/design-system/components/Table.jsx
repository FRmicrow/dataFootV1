import React from 'react';
import './Table.css';

const Table = ({ columns, data, loading = false, rowKey = 'id', onRowClick, className = '', style = {}, interactive = false }) => {