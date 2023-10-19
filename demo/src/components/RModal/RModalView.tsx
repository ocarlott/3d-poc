import React from 'react';
import Modal from 'react-modal';
import { ValidationResults } from '../../types';
import ValidationContent from './ValidationContent/ValidationContent';

export function RModalView(props: {
  isOpen: boolean;
  onRequestClose: () => void;
  handleDownload: () => void;
  validationRef: React.RefObject<HTMLDivElement>;
  validationResults?: ValidationResults | null;
}) {
  return (
    <Modal isOpen={props.isOpen} onRequestClose={props.onRequestClose} style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.headerText}>Validation Result</h1>
        <button style={styles.downloadButton} onClick={props.handleDownload}>
          Download
        </button>
      </div>

      <div ref={props.validationRef}>
        {props.validationResults && (
          <ValidationContent validationResults={props.validationResults} />
        )}
      </div>
    </Modal>
  );
}

const styles = {
  container: {
    content: {
      background: '#242424',
    },
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    display: 'inline-block',
    fontSize: '2rem',
  },
  downloadButton: {
    background: '#394867',
  },
};
