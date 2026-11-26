import type { Route } from "./+types/home";
import Navbar from "../../components/Navbar";
import { ArrowRight, ArrowUpRight, Clock, Layers, Trash2 } from "lucide-react";
import Button from "../../components/ui/Button";
import Upload from "../../components/Upload";
import { useNavigate, useOutletContext } from "react-router";
import {useEffect, useRef, useState} from "react";
import { createProject, getProjects, deleteProject } from "../../lib/puter.action";


export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DesignItem[]>([])
  const isCreatingProjectRef = useRef(false);
  const { userName, userId, isSignedIn } = useOutletContext<AuthContext>();

  
const handleUploadComplete = async (base64Image: string) => {
    if (isCreatingProjectRef.current) return false;

    isCreatingProjectRef.current = true;

    try {
        const newId = Date.now().toString();
        const name = `Residence ${newId}`;

        const newItem: DesignItem = {
            id: newId,
            name,
            sourceImage: base64Image,
            renderedImage: undefined,
            timestamp: Date.now(),
            creatorName: userName || "Unknown user",
            ownerId: userId ?? null,
            isPublic: false,
        };

        // Saving is attempted, but navigation must not depend on it.
        const saved = await createProject({
            item: newItem,
            visibility: "private",
        });

        if (saved) {
            setProjects((prev) => [saved, ...prev]);
        }

        const projectToOpen = saved ?? newItem;

        navigate(`/visualizer/${newId}`, {
            state: {
                initialProject: projectToOpen,
                initialImage: base64Image,
                name,
            },
        });

        return true;
    } catch (error) {
        console.error("Project upload failed:", error);
        return false;
    } finally {
        isCreatingProjectRef.current = false;
    }
};



const handleDeleteProject = async (
    event: React.MouseEvent,
    projectId: string
) => {
    event.stopPropagation();

    const confirmed = window.confirm(
        "Are you sure you want to delete this project? This cannot be undone."
    );

    if (!confirmed) return;

    const deleted = await deleteProject({ id: projectId });

    if (!deleted) {
        alert("Unable to delete project. Please try again.");
        return;
    }

    setProjects((prev) => prev.filter((project) => project.id !== projectId));
};

  
useEffect(() => {
    let cancelled = false;

    const fetchProjects = async () => {
        if (!isSignedIn) {
            setProjects([]);
            return;
        }

        const items = await getProjects();

        if (!cancelled) {
            setProjects(items);
        }
    };

    fetchProjects();

    return () => {
        cancelled = true;
    };
}, [isSignedIn]);


  return(
    <div id="top" className="home">
      <Navbar/>

      <section className="hero">

        <div className="announce">

          <div className="dot">

            <div className="pulse">

            </div>

          </div>

          <p>Introducing LayoutLens 2.0</p>

        </div>

        <h1>Build beautiful spaces at the speed of thought with LayoutLens</h1>

        <p className="subtitle">
          LayoutLens is an AI- first design environment that helps you visualize, render, and ship architectural projects faster than ever.
        </p>

        <div id="upload" className="actions">

          <a href="#upload" className="cta">
            Start Building <ArrowRight className="icon" />
          </a>

          <Button variant="outline" size="lg" className="demo">
            Watch Demo
          </Button>

        </div>

        <div  className="upload-shell">

          <div className="grid-overlay" />

          <div className="upload-card">

            <div className="upload-head">

              <div className="upload-icon">
                <Layers className="icon" />
              </div>

              <h3>Upload your floor plan</h3>

              <p>Supports JPG, PNG, formats up to 10MB </p>

            </div>
          
            <Upload onComplete={handleUploadComplete} />

          </div>

        </div>

      </section>

      <section id="projects" className="projects">

        <div className="section-inner">

          <div className="section-head">

            <div className="copy">
              <h2>Projects</h2>
              <p>Your latest work and shared community projects, all in one place.</p>
            </div>

          </div>

          <div className="projects-grid">
            
            {projects
  .filter((project) => Boolean(project.renderedImage))
  .map(({id, name, renderedImage, sourceImage, timestamp, creatorName, ownerId}) => (
              <div key={id} className="project-card group relative" onClick={() => navigate(`/visualizer/${id}`)}>

  

                <div className="preview">

                  <img src={renderedImage || sourceImage} alt="Project" />

                  <div className="badge">
                    <span>Community</span>
                  </div>

                </div>

                <div className="card-body">
                  <div>
                    <h3>{name}</h3>

                    <div className="meta">

                      <Clock size={12} />
                      <span>{new Date(timestamp).toLocaleDateString()}</span>
                      <span>By {creatorName || "Unknown user"}</span>

                    </div>

                  </div>

                  
<div className="card-actions">
    {userId && ownerId === userId && (
        <button
            type="button"
            className="delete-project-btn"
            title="Delete project"
            onClick={(event) => handleDeleteProject(event, id)}
        >
            <Trash2 size={16} />
        </button>
    )}

    <div className="arrow">
        <ArrowUpRight size={18} />
    </div>
</div>


                </div>

              </div>

            ))}
            

          </div>

        </div>

      </section>

    </div>
  )
}
